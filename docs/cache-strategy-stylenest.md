## Cache Strategy - StyleNest

### 1. Product Listing
Key: stylenest:products:page:<page>:limit:<limit>:category:<category>:sort:<sort>
TTL: 600 seconds

### 2. Homepage Products
Key: stylenest:products:home
TTL: 600 seconds

### 3. Admin Dashboard Stats
Key: stylenest:admin:stats
TTL: 120 seconds

---

### Cache Invalidation Rules

- On product create/update/delete:
  - Invalidate homepage cache
  - Let paginated cache expire OR clear using pattern

- Admin stats:
  - No manual invalidation (short TTL)

---

### Cache Behavior

1. Check Redis
2. If HIT → return cached data
3. If MISS:
   - Fetch from DB
   - Store in Redis (JSON.stringify)
   - Return response