<?php

namespace App\Http\Traits;

use App\Models\User;
use App\Services\SynclyConnectorClient;
use App\Http\Traits\ResponseTrait;
use Log;

trait ShopifyOrderTrait
{
    use ResponseTrait;

    public function getOrdersFromShopify(User $user)
    {
        $client = app(SynclyConnectorClient::class);
        if (!$client->ensureConnector($user)) {
            return false;
        }
        try {
            $orderCount = $this->getOrdersCountFromShopify($user);
            $cursor = 'null';
            $loop = max(1, (int) ceil($orderCount / 250));
            $hasErrors = false;
            for ($i = 1; $i <= $loop; $i++) {
                [$orders, $nextCursor] = $this->shopifyGraphqlOrderQuery($user, $cursor);
                if (empty($orders)) {
                    break;
                }
                $batch = [];
                foreach ($orders as $order) {
                    $batch[] = $this->normalizeOrderForBackend(
                        $this->transformShopifyOrderData($order)
                    );
                    if (count($batch) >= 50) {
                        if (!$client->ingestBatch($user, 'order', $batch, 'initial')) {
                            $hasErrors = true;
                        }
                        $batch = [];
                    }
                }
                if ($batch !== [] && !$client->ingestBatch($user, 'order', $batch, 'initial')) {
                    $hasErrors = true;
                }
                if ($nextCursor) {
                    $cursor = '"' . $nextCursor . '"';
                } else {
                    break;
                }
            }
            if ($hasErrors) {
                throw new \Exception("Some orders could not be synced to Syncly backend.");
            }
        } catch (\Exception $e) {
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));
            return false;
        }
        return true;
    }
    public function getOrdersCountFromShopify($user)
    {
        $query = <<<QUERY
            query{
                ordersCount(limit: 2000){
                    count
                    precision
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        Log::info("Orders Count Query Result: " . json_encode($result, JSON_PRETTY_PRINT));
        if ($result->errors) {
            return 0;
        } else {
            return $result->body->data->ordersCount->count;
        }
    }
    public function shopifyGraphqlOrderQuery($user, $cursor)
    {
        $query = <<<QUERY
            query {
                orders(first: 250, after: $cursor) {
                    edges {
                        node {
                            id
                            email
                            displayFinancialStatus
                            displayFulfillmentStatus
                            name
                            updatedAt
                            note
                            phone
                            subtotalPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            tags
                            totalDiscountsSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalOutstandingSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalShippingPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalTaxSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalTipReceivedSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalWeight
                            customer {
                                id
                                email
                                firstName
                                lastName
                                phone
                            }
                            lineItems(first: 250) {
                                edges {
                                    node {
                                        id
                                        originalUnitPriceSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        quantity
                                        sku
                                        title
                                        totalDiscountSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        variant {
                                            id
                                        }
                                    }
                                }
                            }
                            shippingAddress {
                                firstName
                                lastName
                                address1
                                phone
                                city
                                zip
                                province
                                country
                                company
                                countryCodeV2
                                provinceCode
                            }
                            fulfillments(first: 250){
                                id
                                location{
                                    id
                                }
                                name
                                service{
                                    type
                                }
                                displayStatus
                                status
                                trackingInfo{
                                    company
                                    number
                                    url
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            return [null, null];
        } else {
            $orders = $result->body->data->orders->edges;
            $cursor = $result->body->data->orders->pageInfo->endCursor;
            return [$orders, $cursor];
        }
    }
    public function storeData($order, User $user, $update = false)
    {
        $client = app(SynclyConnectorClient::class);
        if (!$client->ensureConnector($user)) {
            return false;
        }
        $record = $this->normalizeOrderForBackend($order);
        return $client->ingestBatch($user, 'order', [$record], 'delta');
    }
    public function deleteOrder($orderId, User $user)
    {
        $client = app(SynclyConnectorClient::class);
        if (!$client->ensureConnector($user)) {
            return false;
        }
        $id = (string) $orderId;
        return $client->ingestDelta($user, 'order', 'delete', $id, [
            'id' => $id,
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    public function normalizeOrderForBackend($order): array
    {
        $o = is_array($order) ? $order : json_decode(json_encode($order), true);
        $status = $o['financial_status'] ?? $o['status'] ?? 'pending';
        if (is_string($status)) {
            $status = strtolower(str_replace([' ', '/'], ['_', '_'], $status));
        }
        return [
            'id' => (string) ($o['id'] ?? ''),
            'order_number' => (string) ($o['name'] ?? $o['order_number'] ?? ''),
            'status' => (string) $status,
            'currency' => $o['currency'] ?? $o['presentment_currency'] ?? null,
            'total_amount' => $o['total_price'] ?? null,
            'updated_at' => $o['updated_at'] ?? now()->toIso8601String(),
        ];
    }
    public function transformShopifyOrderData($data): array
    {
        $node = $data->node;
        $orderLineItems = [];
        if (!empty($node->lineItems->edges)) {
            foreach ($node->lineItems->edges as $edge) {
                $lineItem = $edge->node;
                $orderLineItems[] = [
                    'id' => $this->extractId($lineItem->id),
                    'price' => $lineItem->originalUnitPriceSet->shopMoney->amount ?? null,
                    'quantity' => $lineItem->quantity ?? null,
                    'sku' => $lineItem->sku ?? null,
                    'title' => $lineItem->title ?? null,
                    'total_discount' => $lineItem->totalDiscountSet->shopMoney->amount ?? 0,
                    'variant_id' => $lineItem->variant?->id ? $this->extractId($lineItem->variant->id) : null,
                ];
            }
        }
        $fulfillments = [];
        if (!empty($node->fulfillments)) {
            foreach ($node->fulfillments as $fulfillment) {
                $fulfillments[] = [
                    "id" => $this->extractId($fulfillment->id),
                    "location_id" => $this->extractId($fulfillment->location->id ?? null),
                    "name" => $fulfillment->name,
                    "service" => $fulfillment->service->type,
                    "shipment_status" => $fulfillment->displayStatus,
                    "status" => $fulfillment->status,
                    "tracking_company" => $fulfillment->trackingInfo[0]->company,
                    "tracking_number" => $fulfillment->trackingInfo[0]->number,
                    "tracking_url" => $fulfillment->trackingInfo[0]->url,
                ];
            }
        }
        $customer = $node->customer;
        if (!empty($customer)) {
            $customer = [
                'id' => $this->extractId($customer->id),
                "email" => $customer->email ?? null,
                "first_name" => $customer->firstName ?? null,
                "last_name" => $customer->lastName ?? null,
                "phone" => $customer->phone ?? null,
            ];
        }
        $shippingAddress = $node->shippingAddress;
        if (!empty($shippingAddress)) {
            $shippingAddress = [
                "first_name" => $shippingAddress->firstName,
                "last_name" => $shippingAddress->lastName,
                "address1" => $shippingAddress->address1,
                "phone" => $shippingAddress->phone,
                "city" => $shippingAddress->city,
                "zip" => $shippingAddress->zip,
                "province" => $shippingAddress->province,
                "country" => $shippingAddress->country,
                "company" => $shippingAddress->company,
                "country_code" => $shippingAddress->countryCodeV2,
                "province_code" => $shippingAddress->provinceCode
            ];
        }
        $order = [
            'id' => $this->extractId($node->id),
            'updated_at' => $node->updatedAt ?? null,
            "contact_email" => $node->email,
            "email" => $node->email,
            "financial_status" => $node->displayFinancialStatus,
            "fulfillment_status" => $node->displayFulfillmentStatus,
            "name" => $node->name,
            "note" => $node->note,
            "phone" => $node->phone,
            "subtotal_price" => $node->subtotalPriceSet->shopMoney->amount ?? 0,
            "tags" => $this->arrayToString($node->tags),
            "total_discounts" => $node->totalDiscountsSet->shopMoney->amount ?? 0,
            "total_line_items_price" => 0,
            "total_outstanding" => $node->totalOutstandingSet->shopMoney->amount ?? 0,
            "total_price" => $node->totalPriceSet->shopMoney->amount ?? 0,
            "total_shipping_price" => $node->totalShippingPriceSet->shopMoney->amount ?? 0,
            "total_tax" => $node->totalTaxSet->shopMoney->amount ?? 0,
            "total_tip_received" => $node->totalTipReceivedSet->shopMoney->amount ?? 0,
            "total_weight" => $node->totalWeight,
            'line_items' => $orderLineItems,
            'customer' => $customer,
            'shipping_address' => $shippingAddress,
            'fulfillments' => $fulfillments,
        ];
        return $order;
    }
    public function arrayToObject($data)
    {
        return json_decode(json_encode($data));
    }
    public function arrayToString($data)
    {
        if (is_array($data)) {
            if (empty($data)) {
                return '';
            } else {
                return implode(',', $data);
            }
        }
        return $data;
    }
    public function extractId($id)
    {
        $arr = explode('/', $id);
        return end($arr);
    }
}
