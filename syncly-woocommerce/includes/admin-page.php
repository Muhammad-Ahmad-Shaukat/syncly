<?php

if (!defined('ABSPATH')) exit;

function syncly_admin_page() {

    $token = get_option('syncly_token');

    echo '<div class="wrap">';
    echo '<h1>Syncly WooCommerce</h1>';

    if (!$token) {

        echo "<h2>👋 Welcome to Syncly</h2>";
        echo "<p>Connect your store to manage products, orders & inventory.</p>";

        echo '<button onclick="document.getElementById(\'loginBox\').style.display=\'block\'">
                Connect Store
              </button>';

        echo '<div id="loginBox" style="display:none;margin-top:20px;">';

        ?>
        <form method="post">
            <h3>Login to Syncly</h3>

            <input type="text" name="syncly_email" placeholder="Email" required style="width:300px;"><br><br>
            <input type="password" name="syncly_password" placeholder="Password" required style="width:300px;"><br><br>

            <button type="submit" name="syncly_login">Login & Connect</button>
        </form>
        <?php

        echo '</div>';

        if (isset($_POST['syncly_login'])) {

            $email = sanitize_email($_POST['syncly_email']);
            $password = sanitize_text_field($_POST['syncly_password']);

            $result = syncly_api_login($email, $password);

            if (isset($result['token'])) {
                update_option('syncly_token', $result['token']);
                echo "<script>location.reload();</script>";
            } else {
                $msg = $result['error'] ?? 'Invalid credentials';
                echo "<p style='color:red'>$msg</p>";
            }
        }
    }

    else {

        echo "<h2>🎉 Store Connected</h2>";
        echo "<p>Your WooCommerce store is linked with Syncly.</p>";

        echo "<ul>
                <li>Products sync enabled</li>
                <li>Orders sync enabled</li>
                <li>Inventory tracking active</li>
              </ul>";

        echo '<form method="post">
                <button name="syncly_logout">Disconnect Store</button>
              </form>';

        if (isset($_POST['syncly_logout'])) {
            delete_option('syncly_token');
            delete_option('syncly_store_id');
            echo "<script>location.reload();</script>";
        }
    }

    echo '</div>';
}