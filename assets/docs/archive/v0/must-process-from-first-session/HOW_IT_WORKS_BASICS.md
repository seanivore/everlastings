# How It Works Basics

## How Updates Work

  1. **You create content**
  
     + Take 7-15 photos per piece
     + Write story card (we'll provide Lorem ipsum length examples)
     + Fill out product details
     + Upload photos to Google Drive or designated location

  2. **We process**
  
     + Photos uploaded to Cloudflare R2 CDN
     + JSON file created with all data
     + Committed to GitHub repository

  3. **Automated deployment**
  
     + GitHub Action detects new file
     + Manifest rebuilds automatically
     + Site redeploys (30-60 seconds)
     + Product appears live on website

  4. **When someone purchases**
  
     + Stripe processes payment
     + Webhook triggers JSON update
     + Availability changes to "sold"
     + Product page updates automatically
     + "Sold" collection now includes it