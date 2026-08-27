<?php
/**
 * Plugin Name:       ZeroSMTP
 * Plugin URI:        https://github.com/msgwing/ZeroSMTP
 * Description:       Sends WordPress email through the ZeroSMTP relay, for sites whose Microsoft 365 mailbox stops accepting a username and password at the end of December 2026.
 * Version:           1.0.0
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       zerosmtp
 *
 * @package ZeroSMTP
 */

defined( 'ABSPATH' ) || exit;

const ZEROSMTP_HOST    = 'mx.msgwing.com';
const ZEROSMTP_PORT    = 587;
const ZEROSMTP_OPTIONS = 'zerosmtp_settings';

/**
 * Read the stored settings, with every key present.
 *
 * Callers index into this without checking, so a partial row from an older
 * version must not produce an undefined-index notice on somebody's site.
 *
 * @return array{login:string,password:string,enabled:string}
 */
function zerosmtp_settings() {
	$zapisane = get_option( ZEROSMTP_OPTIONS, array() );

	return array(
		'login'    => isset( $zapisane['login'] ) ? (string) $zapisane['login'] : '',
		'password' => isset( $zapisane['password'] ) ? (string) $zapisane['password'] : '',
		'enabled'  => isset( $zapisane['enabled'] ) ? (string) $zapisane['enabled'] : '',
	);
}

/**
 * Point PHPMailer at the relay.
 *
 * This runs on every outgoing message, so it stays cheap and it refuses
 * quietly rather than throwing: a settings page nobody has filled in yet must
 * leave WordPress sending exactly as it did before the plugin was installed.
 *
 * @param PHPMailer\PHPMailer\PHPMailer $mailer The mailer WordPress is about to use.
 * @return void
 */
function zerosmtp_configure( $mailer ) {
	$u = zerosmtp_settings();

	if ( 'yes' !== $u['enabled'] || '' === $u['login'] || '' === $u['password'] ) {
		return;
	}

	$mailer->isSMTP();
	$mailer->Host       = ZEROSMTP_HOST;
	$mailer->Port       = ZEROSMTP_PORT;
	$mailer->SMTPAuth   = true;
	$mailer->SMTPSecure = 'tls';
	$mailer->Username   = $u['login'];
	$mailer->Password   = $u['password'];

	/*
	 * The From address has to be the relay login. Leaving the site's own
	 * domain here while sending through a different one is the single most
	 * common way this ends up in a spam folder, and the person configuring it
	 * has no way to see that happening.
	 */
	$mailer->From = $u['login'];
	$mailer->Sender = $u['login'];
}
add_action( 'phpmailer_init', 'zerosmtp_configure' );

/**
 * Register the settings page.
 *
 * @return void
 */
function zerosmtp_menu() {
	add_options_page(
		__( 'ZeroSMTP', 'zerosmtp' ),
		__( 'ZeroSMTP', 'zerosmtp' ),
		'manage_options',
		'zerosmtp',
		'zerosmtp_page'
	);
}
add_action( 'admin_menu', 'zerosmtp_menu' );

/**
 * Register the option and its sanitiser.
 *
 * @return void
 */
function zerosmtp_register() {
	register_setting(
		'zerosmtp',
		ZEROSMTP_OPTIONS,
		array( 'sanitize_callback' => 'zerosmtp_sanitize' )
	);
}
add_action( 'admin_init', 'zerosmtp_register' );

/**
 * Clean what came out of the form.
 *
 * The password is deliberately not passed through sanitize_text_field():
 * that strips characters which are legal in a generated password, and a
 * silently altered password fails authentication with an error that points
 * at the credentials rather than at this function.
 *
 * @param mixed $wejscie Raw form input.
 * @return array Sanitised settings.
 */
function zerosmtp_sanitize( $wejscie ) {
	$wejscie = is_array( $wejscie ) ? $wejscie : array();

	return array(
		'login'    => isset( $wejscie['login'] ) ? sanitize_email( $wejscie['login'] ) : '',
		'password' => isset( $wejscie['password'] ) ? trim( (string) $wejscie['password'] ) : '',
		'enabled'  => ( isset( $wejscie['enabled'] ) && 'yes' === $wejscie['enabled'] ) ? 'yes' : '',
	);
}

/**
 * Render the settings page.
 *
 * @return void
 */
function zerosmtp_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$u = zerosmtp_settings();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'ZeroSMTP', 'zerosmtp' ); ?></h1>

		<p>
			<?php
			esc_html_e(
				'Mail leaves from your generated @msgwing.com address rather than your own domain, and the limit is 200 messages a day. For password resets and contact forms that is usually fine. For WooCommerce order confirmations it often is not.',
				'zerosmtp'
			);
			?>
		</p>

		<form action="options.php" method="post">
			<?php settings_fields( 'zerosmtp' ); ?>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Send through ZeroSMTP', 'zerosmtp' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="<?php echo esc_attr( ZEROSMTP_OPTIONS ); ?>[enabled]" value="yes" <?php checked( 'yes', $u['enabled'] ); ?> />
							<?php esc_html_e( 'Enabled', 'zerosmtp' ); ?>
						</label>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="zerosmtp_login"><?php esc_html_e( 'Login', 'zerosmtp' ); ?></label></th>
					<td>
						<input id="zerosmtp_login" class="regular-text" type="email" name="<?php echo esc_attr( ZEROSMTP_OPTIONS ); ?>[login]" value="<?php echo esc_attr( $u['login'] ); ?>" />
						<p class="description"><?php esc_html_e( 'Your generated @msgwing.com address. Mail will be sent from it.', 'zerosmtp' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="zerosmtp_password"><?php esc_html_e( 'Password', 'zerosmtp' ); ?></label></th>
					<td>
						<input id="zerosmtp_password" class="regular-text" type="password" name="<?php echo esc_attr( ZEROSMTP_OPTIONS ); ?>[password]" value="<?php echo esc_attr( $u['password'] ); ?>" autocomplete="new-password" />
						<p class="description"><?php esc_html_e( 'Stored in the WordPress database. Anybody who can read the database can read it.', 'zerosmtp' ); ?></p>
					</td>
				</tr>
			</table>

			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
