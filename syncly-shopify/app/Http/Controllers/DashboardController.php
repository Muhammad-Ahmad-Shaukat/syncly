<?php

namespace App\Http\Controllers;

use App\Jobs\OrderSyncJob;
use App\Jobs\ProductSyncJob;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        $user = User::query()->where('id', auth()->id())->first();

        if ($user && (int) $user->order_sync === 0) {
            OrderSyncJob::dispatch($user->id);
            $user->order_sync = 1;
            $user->save();
        }
        if ($user && (int) $user->product_sync === 0) {
            ProductSyncJob::dispatch($user->id);
            $user->product_sync = 1;
            $user->save();
        }

        return $this->render('Dashboard');
    }

    public function orderSeacrhfilter(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Order search uses Syncly backend; implement GraphQL filter here if needed.',
        ]);
    }
}
