<?php

namespace App\Models;

use Osiset\ShopifyApp\Traits\ShopModel;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Osiset\ShopifyApp\Contracts\ShopModel as IShopModel;

class User extends Authenticatable implements IShopModel
{
    use HasFactory, Notifiable;
    use ShopModel;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'syncly_store_id',
        'syncly_access_token',
        'syncly_refresh_token',
        'syncly_access_expires_at',
        'syncly_webhook_secret',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'syncly_access_token',
        'syncly_refresh_token',
        'syncly_webhook_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'syncly_access_expires_at' => 'datetime',
        ];
    }
}
