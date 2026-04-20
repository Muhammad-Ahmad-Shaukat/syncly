<?php

function syncly_admin_page() {
    $token = get_option('syncly_token');

    echo '<div class="wrap">';
    echo '<h1>Syncly Connector</h1>';

    // If NOT logged in → show login form
    if (!$token) {
        ?>
        <h2>Connect your Syncly account</h2>

        <form method="post">
            <input type="text" name="syncly_email" placeholder="Email" required style="width:300px;"><br><br>
            <input type="password" name="syncly_password" placeholder="Password" required style="width:300px;"><br><br>
            <button type="submit" name="syncly_login">Login</button>
        </form>
        <?php

        if (isset($_POST['syncly_login'])) {
            syncly_login_user($_POST['syncly_email'], $_POST['syncly_password']);
        }

    } else {
        // LOGGED IN STATE
        echo "<h2>🎉 Connected Successfully</h2>";
        echo "<p>Your store is now synced with Syncly.</p>";

        echo "<h3>Next Step</h3>";
        echo "<p>Open the Syncly mobile app to manage products, inventory and orders in real time.</p>";

        echo '<form method="post"><button name="syncly_logout">Disconnect</button></form>';

        if (isset($_POST['syncly_logout'])) {
            delete_option('syncly_token');
            echo "<script>location.reload();</script>";
        }
    }

    echo '</div>';
}