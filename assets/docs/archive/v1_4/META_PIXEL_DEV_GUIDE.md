Well, it said I can copy the instructions for developers but it won't let me. I did google to see if there was a CLI and got this: 

As of May 2026, Meta has introduced an official Ads CLI in open beta, allowing developers and marketers to manage Meta Ads campaigns, create campaigns, adjust budgets, and pull performance data directly from the terminal, simplifying workflows with AI agents. It is designed for automation, not specifically for the UI-based "Events Manager" data source setup. [1, 2]  
Key Aspects of the New Meta Ads CLI (2026) 

• Purpose: Enables programmatic management of Facebook/Instagram ads, bypassing the web-based Ads Manager GUI. 
• Capabilities: Users can create campaigns, adjust budgets, change targeting via scripts, and analyze performance metrics directly in the terminal. 
• Workflow: Compatible with terminal-based automation and  AI agents like Claude Code 
. 
• Access: It is an official tool from Meta available to developers to increase efficiency in ad operations. [1, 2]  

Distinction from "Events Manager" 

• The CLI mentioned is focused on Ads Management (campaigns, budgets). 
• The web-based Events Manager (under Meta Business Suite) remains the tool for pixel data, conversion API setups, and event tracking configuration. [2, 3, 4]  

For setting up server-side event integration via code, see the official  Meta Conversions API documentation 
. 

AI responses may include mistakes.

[1] https://www.facebook.com/WorkWithCSLBrands/posts/meta-just-dropped-an-official-ads-climanage-facebook-and-instagram-ads-from-your/954049530675163/
[2] https://www.instagram.com/p/DX9MoEdH4MO/
[3] https://www.youtube.com/watch?v=LPmaqJGpB3U
[4] https://transcenddigital.com/blog/events-manager-facebook-pixel/
[5] https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-cli/setup/get-started




Then I googled MCPs and got 

Meta has introduced Meta Ads AI Connectors in open beta (as of April 2026), featuring a Meta-authenticated Ads Model Context Protocol (MCP) server that allows you to manage Meta ads and analyze campaign data directly within AI tools like Claude and ChatGPT.This allows for conversational management of Facebook ads using natural language, bypassing the need to manually navigate the traditional Ads Manager interface.Key Features of Meta Ads MCPConversational Ad Management: You can edit campaigns, adjust budgets, and analyze performance using natural language in ChatGPT or Claude.Secure Access: It provides a secure, Meta-authenticated connection to your account without needing to set up complex API coding or share credentials.Real-time Analytics: The connector provides data on campaign performance, audience insights, and catalog data to allow AI to make informed, non-generic suggestions.Cross-Channel Insights: Enables comparing Meta ad performance with data from other platforms.How to Connect and UseSelect a Tool: The connector works with AI platforms that support MCP, such as Claude Desktop.Authenticate: You can connect using a Remote MCP server (recommended for simplicity) or a local installation, which requires a Meta Developer App.Setup via Interface: In tools like Claude, you navigate to settings, select connectors, and add the official Meta Ads MCP URL.Use Prompting: Once connected, you can ask questions like "Show me all ads running for more than 14 days where CTR dropped more than 20%" or "What is my Pixel health?".Common Use CasesPixel Debugging: The MCP can connect directly to Meta's Marketing API and Events Manager to analyze pixel data (page views, purchases) in real-time.Campaign Audits: Quickly identify disapproved ads, high-frequency ad sets, or ads with low ROAS.[Creative Optimization:](https://brijr/meta-mcp: MCP Server for connecting to the Meta Marketing API) Analyze which creatives are performing best and automate the updating of campaign assets.For quick implementation, solutions like Ryze AI or Composio offer pre-built MCP servers specifically designed to connect Facebook Ads and Events Manager to AI agents.