# v1.4.3 Implementation Preparation Session

## Overview 

Things to discuss or complete for next session. Reminder as to where we left off for quick reference. Etc. other details as needed, this is purely a note keeping, no impact document. 

---

## 1. Meta Business

The last PHASE 0 item on my list is to set up the Facebook and Instagram Page's Business Profile. I started and the settings menus are borderline intentionally convoluted. 

### To Acquire 

  - META_ACCESS_TOKEN=your-meta-access-token
  - META_PIXEL_ID=your-pixel-id

### Current State 

Em didn't have Facebook Page or Instagram Page set up at all. I figured this should make it easier since I can just create them with my account, set up a Business Profile for all the Assets we need to create over time, and then in the end, transfer ownership to her Facebook account. 

### Agent Research 

I've literally been using Facebook professionally since 2011 and Facebook Business since it came out and I swear it is always changing. 

  - Please have subagents research the Facebook help guides thoroughly 
  - Create for me a step by step guide to setup just what is needed to get those two items 
  - Ensure that they are pulling exclusively from the most updated information
  - There are likely a million ways to do things, this should be accounted for 
  - Provide the most direct route

---

## 2. Implementation Guide Context Management

Please consider the following and come up with the best solution. Don't just use mine, please. I need your expertise. 

### Overview 

  - Our completed implementation guide is 40,000 tokens: `assets/docs/archive/v1_4/v1_4_3_IMPLEMENT.md`
  - There are two parallel tracks (A and B) for the frontend and backend. 
  - The third track (C) wires the two together. 

### Problem 

My concern is that we might overwhelm agents with unnecessary information if we give them the entire document. 

### Solution

  1. Separate purely reference materials. 
     - Pull them from the guide 
     - Add them to our master architecture document: `assets/docs/EVERLASTINGS_STORE.md`
     - Logic is that the architecture document will be used for context regardless, so it doesn't need to be on both 
     - Track A doesn't even start until line 959
     - Everything above is reference that is making the guide less "exclusively executable" 
  2. Finish all PHASE 0 items. 
     - My tasks are all complete or indicate what is missing and why 
     - Anything missing from my end is not blocking 
     - During the PHASE 0 session the agent did set up branches and did boot strapping 
     - Those items that the agent completed did not get checked off 
     - Please validate that all of those items are complete and check them off 
  3. Completely condense the PHASE 0 items. 
     - Leave only the bare minimum completed checklists so that they can be referenced if needed
     - None of the more detailed directional stuff is needed for a completed task 
  4. Create track-specific implementation guides. 
     - Understand the context they will be provided 
       - `assets/docs/EVERLASTINGS_STORE.md`
       - `.agent/DEV_RULES.md`
       - `assets/docs/BRAND.md` (this might just be for the frontend track)
     - Prepare the track-specific documents 
       - Keep only a small overview of the other tracks, just what could be needed by the agent 
       - Add context rules to prevent them from unnecessary exploring 
     - Provide guidance for them to manage their own context as well 
       - The orchestrator who gets the guide will be the newest model with effort set to "extra high" 
       - This setup helps but goes through usage quickly 
       - They should use subagents where possible so that they can manage how much context they actually need to take in
     - Name and place their files in their proper location 
       - `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md`
       - `assets/docs/archive/v1_4/v1_4_3_B_IMPLEMENT.md`
       - `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md`
  5. Prepare for me initiation prompts for each track. 

---

## 3. Respond To Shippo Email **LOW PRIORITY**

+ This is to get API access for setting up shipping 
+ Gives the added benefits that the API plan gets but the standard free plan does not 
  - Connecting UPS account directly 
  - Having more than one email login 
  - Etc. 

### Email from Shippo 

  Shippo Trust & Safety Team (Shippo)
  Apr 21, 2026, 9:15 AM PDT
  Hi Emaline,
  Thanks for your interest in Shippo!
  To maintain a safe and trusted platform for all customers, we may occasionally request additional details before moving forward. At this stage, we’d appreciate if you could share a bit more about your business and how you plan to use our platform. You can share:
  A brief description of your business, including your website or online store URL
  How you plan to use Shippo (e.g., your own platform, partner integration, or APIs like Tracking/Address Validation)
  The types of items you ship, your typical customers, and your primary shipping regions
  Proof of business registration, such as your Articles of Incorporation or equivalent documentation from your country of registration.
  We appreciate your time and look forward to hearing more!
  Best,
  Shippo Team

---

## 4. Confirmation 

Confirm for me that we have everything set so that I can initiate each track session later with confidence.