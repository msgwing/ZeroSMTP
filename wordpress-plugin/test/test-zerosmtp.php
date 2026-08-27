<?php
/**
 * Behaviour tests for the ZeroSMTP plugin, without WordPress.
 *
 * `php -l` proves the file parses. It does not prove that a half-written
 * settings row does not produce a notice on somebody's live site, that the
 * plugin stays out of the way until it is switched on, or that the From
 * address ends up as the relay login rather than the site's own domain -
 * which is the difference between mail arriving and mail being filed as spam.
 *
 * So: stub the dozen WordPress functions the plugin touches, include it, and
 * assert on what it does.
 *
 *     php wordpress-plugin/test/test-zerosmtp.php
 *
 * @package ZeroSMTP
 */

define( 'ABSPATH', __DIR__ );

$GLOBALS['zerosmtp_option'] = array();
$GLOBALS['zerosmtp_hooks']  = array();

function add_action( $hook, $fn ) {
	$GLOBALS['zerosmtp_hooks'][ $hook ] = $fn;
}
function add_options_page( $a, $b, $c, $d, $e ) {}
function register_setting( $a, $b, $c = array() ) {}
function get_option( $name, $default = false ) {
	return isset( $GLOBALS['zerosmtp_option'][ $name ] )
		? $GLOBALS['zerosmtp_option'][ $name ]
		: $default;
}
function sanitize_email( $v ) {
	return filter_var( trim( (string) $v ), FILTER_VALIDATE_EMAIL ) ? trim( (string) $v ) : '';
}
function __( $t, $d = '' ) {
	return $t; }
function esc_html_e( $t, $d = '' ) {
	echo $t; }
function esc_attr( $t ) {
	return $t; }
function esc_html__( $t, $d = '' ) {
	return $t; }
function current_user_can( $c ) {
	return true; }
function settings_fields( $g ) {}
function submit_button() {}
function checked( $a, $b ) {}

require __DIR__ . '/../zerosmtp/zerosmtp.php';

/** Minimal stand-in for PHPMailer: records what the plugin set on it. */
class FakeMailer {
	public $Host     = '';
	public $Port     = 0;
	public $SMTPAuth = false;
	public $Username = '';
	public $Password = '';
	public $From     = 'wordpress@example.com';
	public $Sender   = '';
	public $SMTPSecure = '';
	public $smtp_called = false;
	public function isSMTP() {
		$this->smtp_called = true; }
}

$zdane = 0;
$bledy = array();

/**
 * Assert and record.
 *
 * @param bool   $warunek What must hold.
 * @param string $opis    What it means when it does not.
 * @return void
 */
function sprawdz( $warunek, $opis ) {
	global $zdane, $bledy;
	if ( $warunek ) {
		++$zdane;
		echo "  OK   $opis\n";
	} else {
		$bledy[] = $opis;
		echo "  BLAD $opis\n";
	}
}

// --- 1. Brak zapisanych ustawien nie moze wywrocic strony ---------------
$GLOBALS['zerosmtp_option'] = array();
$u = zerosmtp_settings();
sprawdz(
	array( 'login', 'password', 'enabled' ) === array_keys( $u ),
	'pusta opcja daje komplet kluczy, wiec zaden indeks nie jest niezdefiniowany'
);

// --- 2. Wiersz z poprzedniej wersji, bez czesci kluczy ------------------
$GLOBALS['zerosmtp_option']['zerosmtp_settings'] = array( 'login' => 'a@msgwing.com' );
$u = zerosmtp_settings();
sprawdz( '' === $u['password'] && '' === $u['enabled'], 'niepelny wiersz uzupelnia sie pustymi lancuchami' );

// --- 3. Wylaczona wtyczka nie dotyka poczty ------------------------------
$GLOBALS['zerosmtp_option']['zerosmtp_settings'] = array(
	'login'    => 'a@msgwing.com',
	'password' => 'tajne',
	'enabled'  => '',
);
$m = new FakeMailer();
zerosmtp_configure( $m );
sprawdz( false === $m->smtp_called, 'niezaznaczona zgoda zostawia wysylke dokladnie taka, jaka byla' );
sprawdz( 'wordpress@example.com' === $m->From, 'wylaczona wtyczka nie podmienia adresu nadawcy' );

// --- 4. Wlaczona, ale bez hasla -----------------------------------------
$GLOBALS['zerosmtp_option']['zerosmtp_settings'] = array(
	'login'    => 'a@msgwing.com',
	'password' => '',
	'enabled'  => 'yes',
);
$m = new FakeMailer();
zerosmtp_configure( $m );
sprawdz( false === $m->smtp_called, 'wlaczona bez hasla nie probuje wysylac przez relay' );

// --- 5. Pelna konfiguracja ----------------------------------------------
$GLOBALS['zerosmtp_option']['zerosmtp_settings'] = array(
	'login'    => 'a@msgwing.com',
	'password' => 'tajne',
	'enabled'  => 'yes',
);
$m = new FakeMailer();
zerosmtp_configure( $m );
sprawdz( true === $m->smtp_called, 'komplet ustawien wlacza tryb SMTP' );
sprawdz( 'mx.msgwing.com' === $m->Host && 587 === $m->Port, 'host i port zgadzaja sie z docs/APPS.md' );
sprawdz( true === $m->SMTPAuth && 'tls' === $m->SMTPSecure, 'uwierzytelnianie wlaczone, STARTTLS na 587' );
sprawdz( 'a@msgwing.com' === $m->From && 'a@msgwing.com' === $m->Sender, 'adres nadawcy to login relaya, nie domena strony' );

// --- 6. Sanityzacja formularza -------------------------------------------
$w = zerosmtp_sanitize(
	array(
		'login'    => '  a@msgwing.com  ',
		'password' => '  ha slo!# ',
		'enabled'  => 'yes',
	)
);
sprawdz( 'a@msgwing.com' === $w['login'], 'login przycina sie do poprawnego adresu' );
sprawdz( 'ha slo!#' === $w['password'], 'haslo traci tylko biale znaki na koncach - reszta znakow zostaje' );
sprawdz( 'yes' === $w['enabled'], 'zaznaczone pole zapisuje sie jako yes' );

$w = zerosmtp_sanitize( array( 'enabled' => 'cokolwiek' ) );
sprawdz( '' === $w['enabled'], 'wartosc inna niz yes nie wlacza wysylki' );
sprawdz( '' === $w['login'] && '' === $w['password'], 'brakujace pola nie wywracaja sanityzacji' );

$w = zerosmtp_sanitize( 'to nie jest tablica' );
sprawdz( is_array( $w ) && '' === $w['login'], 'wejscie, ktore nie jest tablica, daje pusty komplet zamiast bledu' );

// --- 7. Wtyczka podpina sie tam, gdzie trzeba ----------------------------
sprawdz( isset( $GLOBALS['zerosmtp_hooks']['phpmailer_init'] ), 'podpiete pod phpmailer_init' );
sprawdz( isset( $GLOBALS['zerosmtp_hooks']['admin_menu'] ), 'podpiete pod admin_menu' );

echo "\n";
if ( $bledy ) {
	echo 'NIEZDANE: ' . count( $bledy ) . ' z ' . ( $zdane + count( $bledy ) ) . "\n";
	exit( 1 );
}
echo "zdane: $zdane / $zdane\n";
