#!/usr/bin/env lua
-- lua-zerosmtp.lua
-- Lua 5.1+ with LuaSocket and LuaSec - ZeroSMTP mx.msgwing.com:465 SSL/TLS
-- Production-ready | Let's Encrypt | SMTP over TLS

local socket = require("socket")
local ssl = require("ssl")
local mime = require("mime")

-- NOTE: variable names are prefixed with ZEROSMTP_ to avoid colliding with
-- reserved/OS-level variables (e.g. USERNAME is auto-set on Windows).
local config = {
  username = os.getenv("ZEROSMTP_USERNAME") or "your-username",
  password = os.getenv("ZEROSMTP_PASSWORD") or "your-password",
  from = os.getenv("ZEROSMTP_FROM") or "sender@example.com",
  to = os.getenv("ZEROSMTP_TO") or "recipient@example.com",
  subject = os.getenv("ZEROSMTP_SUBJECT") or "Test Email from ZeroSMTP"
}

local function read_reply(sock)
  local status, line = sock:receive("*l")
  if not status then
    return nil, line
  end
  return tonumber(line:sub(1, 3)), line
end

local function expect(sock, expected, label)
  local code, line = read_reply(sock)
  if not code or code ~= expected then
    error(string.format("%s failed: %s", label, line or "connection closed"))
  end
end

local function send_command(sock, command)
  local ok, err = sock:send(command .. "\r\n")
  if not ok then
    error("send failed: " .. tostring(err))
  end
end

local function build_message()
  local boundary = string.format("boundary_zerosmtp_%d", socket.gettime())
  return table.concat({
    "From: " .. config.from,
    "To: " .. config.to,
    "Subject: " .. config.subject,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="' .. boundary .. '"',
    "",
    "--" .. boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    "Hello from ZeroSMTP! This is plain text.",
    "",
    "--" .. boundary,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    "<html><body><h1>Hello from ZeroSMTP!</h1><p>This is an HTML email sent via mx.msgwing.com:465</p></body></html>",
    "",
    "--" .. boundary .. "--",
    ""
  }, "\r\n")
end

local function send_email()
  local client = assert(socket.tcp())
  client:settimeout(10)
  assert(client:connect("mx.msgwing.com", 465))

  local tls = assert(ssl.wrap(client, {
    mode = "client",
    protocol = "tlsv1_2",
    verify = "peer"
  }))
  assert(tls:dohandshake())

  expect(tls, 220, "Server greeting")
  send_command(tls, "EHLO zerosmtp-lua")
  expect(tls, 250, "EHLO")
  send_command(tls, "AUTH LOGIN")
  expect(tls, 334, "AUTH LOGIN")
  send_command(tls, mime.b64(config.username))
  expect(tls, 334, "Username")
  send_command(tls, mime.b64(config.password))
  expect(tls, 235, "Authentication")
  send_command(tls, "MAIL FROM:<" .. config.from .. ">")
  expect(tls, 250, "MAIL FROM")
  send_command(tls, "RCPT TO:<" .. config.to .. ">")
  expect(tls, 250, "RCPT TO")
  send_command(tls, "DATA")
  expect(tls, 354, "DATA")
  tls:send(build_message() .. ".\r\n")
  expect(tls, 250, "Message accepted")
  send_command(tls, "QUIT")
  tls:close()
  return true
end

local ok, err = pcall(send_email)
if ok then
  print("Email sent")
  os.exit(0)
else
  print("Email sending failed: " .. tostring(err))
  os.exit(1)
end
