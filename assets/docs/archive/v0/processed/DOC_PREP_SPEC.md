# Everlastings Website Client Project 

## Overview 

  * **Everlastings by Emaline** 

    + Company of client named Emy 
    + Her project manager is "G" a ChatGPT Projects section AI 

  * **Brand and product in short** 

    + Artist with a powerful story 
      - Husband had a brain injury 
      - Lost his personality and will never get it back 
      - They're still together and created a bonding ritual 
    + Creates miniature scenes 
      - He sits at the kitchen table with her
      - She creates tiny little worlds 
      - They relearn what it is like being in each others company 
    + Currently on display for sale in a brick and mortar shop locally here in Massachusetts

### Objective 

  * **Create formal documentation for web development client**

    + GPT thread shared by website design client, Emy to start creation of numbered items below 
      - Analyze the thread to pull out what plan we have so far, which includes feedback from me 
      - Work from bottom up to ensure you're capturing the final information or choices 
      - Find path to thread at bottom of page 


  * **Secondary goal of building out the process in a reusable way** 

    + For my future freelance projects 
      - I have other clients coming down the pipeline for primarily website projects 
      - Emy might also end up wanting marketing, etc. — automations would be cool to have a client for in portfolio 
    + The invoice reusability is pitched below  
    + Is there a way to implement an automated, multi-purpose template connected to the page functionality 
      - A way to input information about the project details like client, hours, cost, discount, etc. 
      - Additionally a way to do the same for the contract, all together in a composable way 
    + Consider Google Forms applied to our JSON architecture 
      - Booked client project or maybe just 'contracts' JSON schema that informs all of the above 
      - Then set up a Google Form to fill this out, which we can do during the setup of her website 
      - We'll need something similar for Emy's website because of the product catalog 

### Documents Defined 

  1. Design scope 
    + Written for Emy and "G" her ChatGPT Projects section manager 
    + Identify and clearly organize all elements of the project
      - Create "high level" requirements and follow other best practice planning stratagem 
      - Flag what is completely missing for us to fill in 
      - Flag where we have decisions to be made, i.e. tech stack, web host, etc. 
    + Where we have options we should include analysis of risk, etc. 
      - Forward thinking for growth 
      - Stability, cost savings, etc. 

  2. Implementation plan 
    + More detailed, for us to follow 
      - Contains only final, decided upon information 
      - Group work into 3 to 12 hour sessions 
    + Do not include actual dates in timeline 
        - We will calculate this to include on contract 
        - That way we can better manage expectations as things inevitably adapt and change 
    + **RUSH DEADLINE** means **STRATEGIC BUILD PLANNING** 
        - If it isn't clear enough in the chat the more interactive features should be strategically held for later 
        - We want to launch as early as possible because of the holiday season 
        - As I write this it is Saturday 6 December 2026 
        - My initial phone call was with her last week on Friday, then lots of planning on Saturday 
        - Then I got a cold that knocked me out a few days this week which I told her; so super rush 
        - Anywhere else we can build in a tiered, multi launch way, let's discuss 

  3. Freelance contract 
    + Sole-proprietorship for just Sean August Horvath 
        - Create accurate representation of hours estimated, but I charge per project not hourly 
        - Then I need to include clear discounts that bring's her down to $300 to $500 
    + Discounted to amount will depend on platform choice 
        - She quickly threw in "$300" during the phone call 
        - But at the time she was expecting probably SquareSpace or Shopify yearly costs 
        - Basically let's just be sure to present all the costs with figuring out scope, and then what is saved 

  4. Invoice to pair with contract 
    + Considering the planned build 
        - Being a dynamic site on static host like my portfolio 
        - But with additional Stripe functionality I was thinking 
    + Maybe while finalizing the scope options we could 
        - Create for me a simple payments.august.style page GitHub Pages standard project 
        - Get that quick experience on setting up Stripe because I'm presuming it is simple but don't want to presume 

## Procedure 

  1. Before reviewing most the files at paths below, it is important for us to understand what has been defined 
    + Group Chat: `/Users/seanivore/Development/everlastings-website/assets/docs/group_chat_thread.md` *fair warning: heavy sycophancy at times*
    + Architecture Model Context Primer Only: `/Users/seanivore/Development/360-design/assets/docs/AI_CONTEXT_PRIMER.md` 
    + Create a comprehensive first draft that will give us one space to gather all information
      - For scope and implementation plan 
      - Information needed; research different tiered options provide pricing etc. 
      - Isolate out parts of their build from the chat that would cost extra like all of the social media
      - It also mentions a blog; that is a whole different animal that would be separate, particularly because we'd want to integrate it with newsletter 
      - Let's price the blog and newsletter one strategically because I do want her to have it it is important 
      - But also we do need to have things held for after holiday like sure gather emails during but we need to divvy up rush work 
      - Similarly we do want to include the more interactive homepage described but we should define a simple method first so we can be live asap
    + Include details in the [Considerations](#considerations) and [Add-ons](#add-ons-to-mention) sections before digging into all the paths in the architecture model section below this section 
  2. Then, because of how many files there are, we'll want to create a plan for processing through the below paths 
    + We did have a decent handful of debugging days so I'd like to be sure we pull as much as we can from the functional files below 
    + As we go through them, we will discuss the page types and media needs of the new website 
      - What the differences in the section pages would look like 
      - Plan and propose structures for he product pages 
      - You'll also note that the original proposed website at the top of the chat thread is more traditional than the interactive homepage G and I planned 
      - This website isn't a functional store but I think it has really great bones 
      `https://design.august.style/projects/webflow-product-page` 
      `/Users/seanivore/Development/design-site/projects/webflow-print-series.html` 
      `/Users/seanivore/Development/design-site/projects/webflow-product-page.html`
    + I also wouldn't feel comfortable not offering strategic advice as well 
      - I see a handful of questionable website elements defined in the chat's original layout like 
      - For conversions you really want product and price and buy now at visible above fold of homepage, every page tbh 
      - The long-form text might help SEO but also might want to be strategically balanced; "2-8 paragraphs" ... 8 is rather intimidating which is not an emotion you want to evoke in someone who is looking at the website; actually we should propose that she make videos, selfie style that include footage of the pieces because we have data on how much that increases sales and it is CRAZY compared to just still photos 
      - I'd like to really nail down the aesthetic language we use for the prompts with the agents; words that AI know well, styles they know well, etc. let's really lean into all of the strengths of our tools all around 
      - Another example is the "pages" they list — ideally most of these would probably just be part of a comprehensive landing page or combined if they link away rather than branching too much because it will make the UX much smoother -- we want to control the narrative aka how they flow through the site, and with too many pages you give that power away and it is important for selling 
      - I provided G a 'Emotionally driven copywriting' SOP we created years ago now, but we can can also get into that since they'll be able to handle majority of that prep work 
      - Meaning **PROCESS WISE** when it comes to implementation, we need to have them set up with the JSON so they can be really working on perfecting project entries, etc. while we build everything out; we should create an initial JSON product with filler text so that we can share how many words looks like what, text sizes, etc. 
      - Not sure if they mention fonts, but you probably remember my feelings on those -- we should use as much system UI aas possible and then choose one decorative font to use tactfully because it really is wild how one font slows down the loading of a webpage 
      - OH and we'll want to define how we'll handle images asap so they can prepare them; let's work smart, I don't want them put in Google Drive if that isn't where we'll need them. I mean they can use that for storage of course if they want, but for our timeline we need them placing images wherever they'll be used from -- I also have only seen a handful and the quality was so far subpar -- but I suppose that could be a high urgency post launch item that honestly I should probably offer as an add-on service as it is another whole animal; I mean a good price for sure because I want this thing to be perfect, but I need to manage my bandwidth 
  3. We'll want to be sure we properly learn how and then clearly document how to integrate Stripe payments 
     `https://docs.stripe.com/`
     `/Users/seanivore/Development/_resources/ai_docs/workspace-tools/STRIPE_LLM_DOCS.txt`
  4. Then we should have enough to at least put together the structure of the defined documents 
    + Important people, email addresses, names, etc. 
    + Emy and her company 
      - Emaline Hoff "emyh@everlastingsbyemaline.com" 
      - Sole-proprietorship with registered Massachusetts DBA <find exact name from chat thread>
      - (978) 996-7375
    + Sean and his information 
      - Sean August Horvath "sean@august.style" 
      - Sole-proprietorship under my name 
      - (424) 744-7687
      - 102 Lunenburg Ave., West Townsend, MA 01474 
      - Email with admin access to Google Workspaces "sean@everlastingsbyemaline.com"
      - Setup alias that goes to Sean's Everlasting's email to set up Stripe, etc. "admin@everlastingsbyemaline.com" 
  5. Sean will share documents 
    + Define options for all decisions 
      - Define roles of myself 
      - My planned tools of architect plan with Claude.ai and then Build in Anti-Gravity Gemini or Claude Code Opus (must consider costs)
      - Anything we would like from G (Project Management GPT AI); copy, work with Emy to create JSON or database entries 
    + Gather any other details needed for creating the contract and invoice 
    + Bring back decisions to finalize scope and implementation document 
  6. Finish all defined documents; invoice Emy 
    + Due to discount we'll require full payment 
    + Whatever signatures, digitally, that are also needed 
    + Define and schedule any necessary milestone meetings or formal updates 
  7. Finalize architecture planning and start agentic build 

### Architecture We're Modeling Website After 

  * **My JSON project entry, 404-fake-out, GitHub Pages, dynamic SPA portfolio**

    + Seems like a good way to manage her having to enter and remove products 
      - In the conversation we mention method for automating back-end sales updates 
      - Ways to create an different-each-visit homepage 
    + AI Context Primer from building the Portfolio 
    `/Users/seanivore/Development/360-design/assets/docs/AI_CONTEXT_PRIMER.md` 

  * **Important files to take inspiration from** 

    + Dynamic template pages 
      - 404 page `/Users/seanivore/Development/360-design/404.html` 
      - Entry page `/Users/seanivore/Development/360-design/entry.html` 
      - Homepage `/Users/seanivore/Development/360-design/index.html` 
      - Section page `/Users/seanivore/Development/360-design/section.html` 

    + Styles Structure 
      - From my portfolio `/Users/seanivore/Development/360-design/styles.css` 
      - CSS from Dia Browser's release landing page because the class structure seemed so flexible and logical, 
      but what are pros and cons of this? Is it long because of the way they did the classes or some other reason? 
      Would it be helpful or annoying to a future developer? It seemed at a glance like such an easy logic to pick up quick 
      `/Users/seanivore/Development/everlastings-website/assets/docs/reference-files/dia-css-class-naming-inspiration.css` 
    
    + Rebuild on push using headless Claude Code in GitHub 
      - Python code `/Users/seanivore/Development/360-design/generate_manifest.py` 
      - GitHub automation `/Users/seanivore/Development/360-design/.github/workflows/manifest.yml` 

  * **Even more important functionality pages**

    + Pulling from JSON entries onto the dynamic homepage/section page tiles and entry pages content 
      - `/Users/seanivore/Development/360-design/assets/js/data-loader.js`
      - `/Users/seanivore/Development/360-design/assets/js/entry-controller.js`
      - `/Users/seanivore/Development/360-design/assets/js/filter-controller.js`
      - `/Users/seanivore/Development/360-design/assets/js/homepage-controller.js`
      - `/Users/seanivore/Development/360-design/assets/js/section-controller.js`
      - `/Users/seanivore/Development/360-design/assets/js/tile-renderer.js` 

  * **JSON schemas just for understanding**

    + "Placement" `/Users/seanivore/Development/360-design/assets/js/placement.json` 
      - Instead of something like this which controls showing specific filters and their content 
      - We'd just have multiple batches of JSON types: 1. Product, 2. Theme (for homepage) 
      - Unless we can think of a way to preemptively provide all we'll want for the interactive homepage themes
      - Then we could put that right on the Product JSONs and manage that by something simple that just lists which products to feature 
      - We will also need to consider different types of projects; seems like could be same product schema, but placement on homepage would differ 
      - Lastly, you'll see the lists of tags in placement.json above, but it needs some kind of better automated fool-proof method 

    + Random "Entry" project `/Users/seanivore/Development/360-design/assets/entries/uid-bsj-738.json` 
      - We'll want to first collect all values giving from the conversation thread 
      - Identify and add any others we'll need 
      - Discuss with team, consider future with interactive homepage etc. 

    + "Manifest" that builds from above "rebuild on push..." scripts 
    `/Users/seanivore/Development/360-design/assets/js/manifest.json` 
      - I imagine this will be very similar 
      - Just like the portfolio, she/G should be able to create a new website section or tag filter just by including the new value on product JSON 
      - Will need webhook automation for sales to update the website accordingly, in addition the current update-on-push system 

  * **For dealing with image-heavy website**

    + This isn't something we implemented on my profile yet 
      - It was planned because I'd like to eventually mint my digital art 
      - Then I'd have more images; right now I just use the embed from the Behance Project site 
      - "Using GitHub as CDN trick" `/Users/seanivore/Development/360-design/assets/docs/image_galleries/github_as_cdn.md`
    + I'm not sure that it is the solution we'll want 
      - For a website store even if it is small artisanal 
      - But it would be good to show as one no-cost option 
      `/Users/seanivore/Development/360-design/assets/docs/image_galleries/github_as_cdn.md` 

### Considerations 

  + For the interactive homepage 
    - Obviously we'll want to include anything from the chat
    - But I also love this Smart, multi-layered, perspective scrolling website background `https://cora.computer/`
    - Do we have a tool that you can use to see that website structure? Or should I grab the files? 

  + Other website hosting options, i.e. they mentioned Squarespace E-commerce 
    - What is Netfliy? 
    - Logistics for possible future migration option needs because of growth 
    ^ e.g. moving from JSON entry to database and/or CMS that is more robust 
    ^ ^ like a headless CMS, Hostinger, etc. 
    - Alternatives and reasons to consider alternatives for site hosting, Re: GitHub Pages 
    - Risk considerations for running checkout on GitHub Pages site 

  + Organize whatever technical stack or tools currently being used and paid for 
    - E.g. Google Workspace, Canva, etc.
    - I'm curious because I'm looking to include integration option considerations after researching discounts or ecosystem tools
    - To provide along side of risk considerations for different options provided in the build and overall architecture of the sales ecosystem 

  + Great UX trick I came across for About Pages, etc. 
    - Four small icons align right and lower in same flex-horizontal div 
        1. Long form content 
        2. Bullet points, but detailed 
        3. Short form content 
        4. Truly short bullet points 
    - UX win -- four ways to consume the content 
    - I like it *almost* as much as when blog posts let you hit play on an audio version while scrolling down through images 

### Add-ons to Mention 

  + Website features such as selective social video post feed 
  + Various purposed triggers that have an LLM write copy on the fly anywhere on the site 
    - This could get interestingly personalized with pixels/cookies tracking 
    - I did something similar but that was with Make.com 
  + Automated research, assessment, and copywriting of SEO and SERP content updates 
  + Automated social content production sourced from website content 
