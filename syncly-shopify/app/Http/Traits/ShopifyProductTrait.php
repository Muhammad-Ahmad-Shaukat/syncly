<?php

namespace App\Http\Traits;

use App\Models\User;
use App\Services\SynclyConnectorClient;
use Log;

trait ShopifyProductTrait
{
    public function getProductsFromShopify(User $user)
    {
        $client = app(SynclyConnectorClient::class);
        if (!$client->ensureConnector($user)) {
            return false;
        }
        try {
            $productCount = $this->getProductsCountFromShopify($user);
            $cursor = 'null';
            $loop = max(1, (int) ceil($productCount / 250));
            $hasErrors = false;
            for ($i = 1; $i <= $loop; $i++) {
                [$products, $nextCursor] = $this->shopifyGraphqlProductQuery($user, $cursor);
                if (empty($products)) {
                    break;
                }
                $batch = [];
                foreach ($products as $product) {
                    $batch[] = $this->normalizeProductForBackend(
                        $this->transformShopifyProductData($product)
                    );
                    if (count($batch) >= 50) {
                        if (!$client->ingestBatch($user, 'product', $batch, 'initial')) {
                            $hasErrors = true;
                        }
                        $batch = [];
                    }
                }
                if ($batch !== [] && !$client->ingestBatch($user, 'product', $batch, 'initial')) {
                    $hasErrors = true;
                }
                if ($nextCursor) {
                    $cursor = '"' . $nextCursor . '"';
                } else {
                    break;
                }
            }
            if ($hasErrors) {
                throw new \Exception("Some products could not be synced to Syncly backend.");
            }
        } catch (\Exception $e) {
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));
            return false;
        }
        return true;
    }
    public function getProductsCountFromShopify($user)
    {
        $query = <<<QUERY
            query{
                productsCount{
                    count
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            return 0;
        } else {
            return $result->body->data->productsCount->count;
        }
    }
    public function shopifyGraphqlProductQuery($user, $cursor)
    {
        $query = <<<QUERY
            query {
                products(first: 250, after: $cursor) {
                    edges {
                        node {
                            id
                            title
                            handle
                            descriptionHtml
                            tags
                            vendor
                            productType
                            status
                            updatedAt
                            variants(first: 250) {
                                edges {
                                    node {
                                        id
                                        inventoryItem{
                                            id
                                        }
                                        title
                                        sku
                                        price
                                        inventoryQuantity
                                        compareAtPrice
                                    }
                                }
                            }
                            media(first: 250) {
                                edges {
                                    node {
                                        ... on MediaImage {
                                            id
                                            image {
                                                url
                                            }
                                        }
                                    }
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
            $products = $result->body->data->products->edges;
            $cursor = $result->body->data->products->pageInfo->endCursor;
            return [$products, $cursor];
        }
    }
    public function storeData($product, User $user)
    {
        $client = app(SynclyConnectorClient::class);
        if (!$client->ensureConnector($user)) {
            return false;
        }
        $record = $this->normalizeProductForBackend($product);
        return $client->ingestBatch($user, 'product', [$record], 'delta');
    }
    public function normalizeProductForBackend($product): array
    {
        $p = is_array($product) ? $product : json_decode(json_encode($product), true);
        $variants = $p['variants'] ?? [];
        $first = [];
        if ($variants !== []) {
            $v0 = $variants[0];
            $first = is_array($v0) ? $v0 : json_decode(json_encode($v0), true);
        }
        $imageUrl = null;
        if (!empty($p['image']['src'])) {
            $imageUrl = $p['image']['src'];
        } elseif (!empty($p['media'][0]['preview_image']['src'])) {
            $imageUrl = $p['media'][0]['preview_image']['src'];
        } elseif (!empty($p['media'][0]['image']['url'])) {
            $imageUrl = $p['media'][0]['image']['url'];
        }
        return [
            'id' => (string) ($p['id'] ?? ''),
            'title' => $p['title'] ?? '',
            'status' => $p['status'] ?? 'draft',
            'price' => $first['price'] ?? null,
            'inventory_quantity' => $first['inventory_quantity'] ?? null,
            'sku' => $first['sku'] ?? null,
            'image_url' => $imageUrl,
            'image_alt_text' => $p['title'] ?? null,
            'updated_at' => $p['updated_at'] ?? now()->toIso8601String(),
        ];
    }
    public function deleteProduct($productId, User $user)
    {
        $client = app(SynclyConnectorClient::class);
        if (!$client->ensureConnector($user)) {
            return false;
        }
        $id = (string) $productId;
        return $client->ingestDelta($user, 'product', 'delete', $id, [
            'id' => $id,
            'updated_at' => now()->toIso8601String(),
        ]);
    }
    public function transformShopifyProductData($data): array
    {
        $node = $data->node;
        $productVariants = [];
        if (!empty($node->variants->edges)) {
            foreach ($node->variants->edges as $edge) {
                $variant = $edge->node;
                $productVariants[] = [
                    'compare_at_price' => $variant->compareAtPrice ?? null,
                    'id' => $this->extractId($variant->id),
                    'price' => $variant->price ?? null,
                    'sku' => $variant->sku ?? null,
                    'title' => $variant->title ?? null,
                    'inventory_item_id' => $this->extractId($variant->inventoryItem->id ?? null),
                    'inventory_quantity' => $variant->inventoryQuantity ?? 0,
                ];
            }
        }
        $productMedia = [];
        if (!empty($node->media->edges)) {
            foreach ($node->media->edges as $index => $edge) {
                $media = $edge->node;
                if ($media) {
                    $productMedia[] = [
                        'id' => $this->extractId($media->id),
                        'position' => $index + 1,
                        'preview_image' => [
                            'src' => $media->image->url ?? null,
                        ],
                    ];
                }
            }
        }
        $product = [
            'body_html' => $node->descriptionHtml,
            'handle' => $node->handle,
            'id' => $this->extractId($node->id),
            'product_type' => $node->productType,
            'title' => $node->title,
            'vendor' => $node->vendor,
            'status' => strtolower($node->status),
            'tags' => $this->arrayToString($node->tags),
            'variants' => $productVariants,
            'media' => $productMedia,
            'updated_at' => $node->updatedAt ?? null,
        ];
        return $product;
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
