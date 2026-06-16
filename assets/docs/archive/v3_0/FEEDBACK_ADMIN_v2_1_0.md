# Initial thoughts looking at /admin

  + The back button takes you back to the page before I added /admin
    - If this is necessary then the navigation needs to be clearer
    - So when I click into a product, I know to click PRODUCT tab to go back to products
    - Though if not necessary that would be rad
  + Tabs to sort "sold" and "archived" etc. in product list
  + Interesting that the one post GPT made before we set up the preview tool for the unseen attributes so they can be reviewed on the staging page as well, is missing the checkout title, short line, and thumbnail
  + GPT said that they don't edit the file name of media you provide them
    - Is this accurate? Because in planning they were supposed to; I'm pretty sure we even gave them naming specifics.
    - Also the first word in the name needs to be specific for where it is being used. I happened to do that in my file names but what if I hadn't?
    - And then, what happens when we have the UPLOAD IMAGE set up and there is no file name provided
    - I am fairly certain that file name can be created while going through Cloudinary process, and we might just need to make those details more specific
  + Obviously the JSON for adding details won't work well if a human is creating a post in the ADMIN panel 
  + **IMPORTANT**: right now it looks like GPT is skipping the alt text for all images. 

# Visuals

There is a lot of common sense UX missing in many different ways. After we look at the images and create a starter list of needs that is as comprehensive as possible, we should later have subagents look at the website, take photos if they can -- if not then there should be a skill that is used to find skills, which means you could look to see if there is a skill that just grabs images of websites automatically, then grab them for them that are more comprehensive than these starters I took. Either way, the point will be that I think the more we have different instances with fresh minds looking at this the more innovative and complete they'll be in getting this up to speed, because it is pretty bad now even just from the "must be able to do everything from either GPT or ADMIN front. We need to cover that front. Then go further towards making it pleasant to use.

  - `assets/docs/archive/images/v2-admin-feedback-1.jpg`
  - `assets/docs/archive/images/v2-admin-feedback-2.jpg`
  - `assets/docs/archive/images/v2-admin-feedback-3.jpg`
  - `assets/docs/archive/images/v2-admin-feedback-4.jpg`
  - `assets/docs/archive/images/v2-admin-feedback-5.jpg`