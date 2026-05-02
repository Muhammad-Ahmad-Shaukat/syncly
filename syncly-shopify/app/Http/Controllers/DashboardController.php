<?php

namespace App\Http\Controllers;

use App\Jobs\OrderSyncJob;
use App\Jobs\ProductSyncJob;
use App\Models\User;
use Illuminate\Http\Request;
use App\Repositories\Order\OrderRepositoryInterface;



class DashboardController extends Controller
{
    protected $OrderRepository;

    public function __construct(OrderRepositoryInterface $OrderRepository)
    {
        $this->OrderRepository = $OrderRepository;
    }
    public function index()
    {
        $user = User::where('id', auth()->user()->id)->first();

        if ($user->order_sync == 0) {
            OrderSyncJob::dispatch(auth()->user()->id);
            $user->order_sync = 1;
            $user->save();
        }
        if ($user->product_sync == 0) {
            ProductSyncJob::dispatch(auth()->user()->id);
            $user->product_sync = 1;
            $user->save();
        }
        return $this->render('Dashboard');
    }
    public function orderSeacrhfilter(Request $request)
    {
        $filters = $request->all();
        $filters['relation'] = [
            'orderCustomer',
            'OrderFulfillments',
            'OrderLineItems',
            'OrderShippingAddress',
        ];

        $filters['financial_status'] = $request->financial_status;
        $filters['fulfillment_status'] = $request->fulfillment_status;

        return $this->OrderRepository->SearchFilter($filters);
    }
}
