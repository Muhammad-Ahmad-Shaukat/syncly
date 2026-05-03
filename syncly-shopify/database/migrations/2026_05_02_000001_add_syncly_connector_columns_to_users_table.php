<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('syncly_store_id')->nullable()->after('remember_token');
            $table->text('syncly_access_token')->nullable();
            $table->text('syncly_refresh_token')->nullable();
            $table->timestamp('syncly_access_expires_at')->nullable();
            $table->string('syncly_webhook_secret', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'syncly_store_id',
                'syncly_access_token',
                'syncly_refresh_token',
                'syncly_access_expires_at',
                'syncly_webhook_secret',
            ]);
        });
    }
};
