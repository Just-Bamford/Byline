# Publisher Integration Example

This guide shows how to integrate Byline into your publication.

## Step 1: Install SDK

```bash
npm install @byline/publisher-sdk
```

## Step 2: Initialize Byline

```javascript
import BylinePublisher from "@byline/publisher-sdk";

const byline = new BylinePublisher({
  contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
  verificationServiceUrl: "https://api.byline.example.com",
  publisherAddress: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
});
```

## Step 3: Protect Your Articles

### Express.js Example

```javascript
import express from "express";
import byline from "./byline";

const app = express();

app.post("/api/articles/:articleId", async (req, res) => {
  const { articleId } = req.params;
  const { token } = req.body;

  // Verify token
  const isValid = await byline.verifyToken(token);

  if (!isValid) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  // Record the read for analytics
  await fetch("https://api.byline.example.com/record-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articleId,
      readerId: token.reader,
      price: token.price,
    }),
  });

  // Serve article content
  const article = await getArticleFromDatabase(articleId);
  res.json({ content: article.content });
});

app.listen(3000);
```

### Next.js Example

```typescript
// pages/api/articles/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import byline from "@/lib/byline";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { token } = req.body;

  // Verify token
  const isValid = await byline.verifyToken(token);

  if (!isValid) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  // Record read
  await fetch(process.env.BYLINE_API_URL + "/record-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articleId: id,
      readerId: token.reader,
      price: token.price,
    }),
  });

  // Get article
  const article = await db.articles.findUnique({
    where: { id: id as string },
  });

  res.json({ content: article.content });
}
```

### Django Example

```python
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import requests
import json

@require_http_methods(["POST"])
def article_detail(request, article_id):
    data = json.loads(request.body)
    token = data.get('token')

    # Verify token
    verify_response = requests.post(
        'https://api.byline.example.com/verify',
        json={'token': token, 'contractId': BYLINE_CONTRACT_ID}
    )

    if not verify_response.json().get('valid'):
        return JsonResponse({'error': 'Invalid or expired token'}, status=403)

    # Record read
    requests.post(
        'https://api.byline.example.com/record-read',
        json={
            'articleId': article_id,
            'readerId': token['reader'],
            'price': token['price'],
        }
    )

    # Get article
    article = Article.objects.get(id=article_id)
    return JsonResponse({'content': article.content})
```

## Step 4: Set Article Prices

```javascript
// Set price for an article
await byline.setArticlePrice("article-123", 0.002); // $0.002

// Get current price
const price = await byline.getArticlePrice("article-123");
console.log(`Article price: $${price}`);
```

## Step 5: Monitor Earnings

```javascript
// Get total earnings
const earnings = await byline.getEarnings();
console.log(`Total: $${earnings.total}`);
console.log(`Pending: $${earnings.pending}`);
console.log(`Settled: $${earnings.settled}`);

// Get article performance
const stats = await fetch(
  "https://api.byline.example.com/articles/article-123/stats",
).then((r) => r.json());

console.log(`Reads: ${stats.reads}`);
console.log(`Revenue: $${stats.revenue}`);
console.log(`Avg price: $${stats.avgPrice}`);
```

## Step 6: Frontend Integration

### React Example

```jsx
import { useState } from "react";
import axios from "axios";

export function ArticleView({ articleId, price }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePurchase = async (token) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`/api/articles/${articleId}`, {
        token,
      });

      setContent(response.data.content);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load article");
    } finally {
      setLoading(false);
    }
  };

  if (!content) {
    return (
      <div className="article-locked">
        <h2>Read this article</h2>
        <p>Price: ${price.toFixed(3)}</p>
        <button onClick={() => handlePurchase(token)}>
          {loading ? "Loading..." : "Unlock Article"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <article>
      <div className="content">{content}</div>
    </article>
  );
}
```

## Step 7: Dashboard

Access your earnings dashboard at:

```
https://dashboard.byline.example.com/publisher
```

View:

- Total earnings
- Earnings by article
- Reader statistics
- Payment history

## Best Practices

### 1. Cache Token Verification

```javascript
const tokenCache = new Map();

async function verifyTokenWithCache(token) {
  const cacheKey = `${token.reader}-${token.article_id}`;

  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  const isValid = await byline.verifyToken(token);
  tokenCache.set(cacheKey, isValid);

  // Clear cache after token expiry
  setTimeout(() => tokenCache.delete(cacheKey), token.expiry * 1000);

  return isValid;
}
```

### 2. Handle Network Errors

```javascript
async function verifyTokenWithRetry(token, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await byline.verifyToken(token);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. Rate Limiting

```javascript
import rateLimit from "express-rate-limit";

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many verification requests",
});

app.post("/api/articles/:id", verifyLimiter, async (req, res) => {
  // ...
});
```

### 4. Logging

```javascript
async function verifyTokenWithLogging(token) {
  const startTime = Date.now();

  try {
    const isValid = await byline.verifyToken(token);
    const duration = Date.now() - startTime;

    console.log({
      event: "token_verified",
      reader: token.reader,
      article: token.article_id,
      valid: isValid,
      duration,
    });

    return isValid;
  } catch (err) {
    const duration = Date.now() - startTime;

    console.error({
      event: "token_verification_failed",
      reader: token.reader,
      article: token.article_id,
      error: err.message,
      duration,
    });

    throw err;
  }
}
```

## Troubleshooting

### Token Verification Fails

1. Check token expiry: `token.expiry > Math.floor(Date.now() / 1000)`
2. Verify contract ID matches
3. Check network connectivity to verification service
4. Review logs for detailed error messages

### Articles Not Loading

1. Ensure token is valid before serving content
2. Check article exists in database
3. Verify reader has sufficient balance
4. Review CORS settings if frontend is on different domain

### Earnings Not Updating

1. Ensure `record-read` endpoint is being called
2. Check backend is running and accessible
3. Verify analytics service is storing data
4. Review logs for errors

## Support

- **Documentation**: https://docs.byline.example.com
- **Issues**: https://github.com/byline/byline/issues
- **Discord**: https://discord.gg/byline
