defmodule ZeroSMTP do
  @host 'mx.msgwing.com'
  @port 465

  defp recv(socket) do
    case :ssl.recv(socket, 0, 10_000) do
      {:ok, data} -> data
      {:error, reason} -> raise "Failed to read SMTP response: #{inspect(reason)}"
    end
  end

  defp send_line(socket, line) do
    :ok = :ssl.send(socket, [line, "\r\n"])
    recv(socket)
  end

  defp expect(response, prefix) do
    if String.starts_with?(response, prefix) do
      response
    else
      raise "Unexpected SMTP response, expected #{prefix}: #{inspect(response)}"
    end
  end

  def run do
    username = System.get_env("ZEROSMTP_USERNAME") || "your-username"
    password = System.get_env("ZEROSMTP_PASSWORD") || "your-password"
    from = System.get_env("ZEROSMTP_FROM") || "sender@example.com"
    to = System.get_env("ZEROSMTP_TO") || "recipient@example.com"
    subject = System.get_env("ZEROSMTP_SUBJECT") || "Test Email from ZeroSMTP"

    {:ok, socket} =
      :ssl.connect(@host, @port, [
        :binary,
        active: false,
        verify: :verify_none
      ])

    try do
      expect(recv(socket), "220")

      expect(send_line(socket, "EHLO mx.msgwing.com"), "250")
      expect(send_line(socket, "AUTH LOGIN"), "334")
      expect(send_line(socket, Base.encode64(username)), "334")
      expect(send_line(socket, Base.encode64(password)), "235")
      expect(send_line(socket, "MAIL FROM:<#{from}>"), "250")
      expect(send_line(socket, "RCPT TO:<#{to}>"), "250")
      expect(send_line(socket, "DATA"), "354")

      body = [
        "From: #{from}",
        "To: #{to}",
        "Subject: #{subject}",
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Hello from ZeroSMTP! This is plain text.",
        "."
      ]
      |> Enum.join("\r\n")

      expect(send_line(socket, body), "250")
      expect(send_line(socket, "QUIT"), "221")
      IO.puts("Email sent via mx.msgwing.com:465")
    after
      :ssl.close(socket)
    end
  end
end

ZeroSMTP.run()
