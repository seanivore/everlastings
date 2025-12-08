# Collaboration Options 

It seems like it would be valuable to have G set up to be able to work directly with our markdown files and in GitHub. Not sure the best way because, well I use Anthropic, but also a quick Google said the connector is read access only. I guess a GitHub MCP might do the trick? 

This will be particularly helpful because you'd be able to add new products for Emy directly — and that `init push` is what triggers our automation and rebuilding of the manifest that makes the dynamic nature of the website update and function -- and now also trigger hooks like updating sold items, adding to other catalogs, etc. 

---

ChatGPT offers native integration with GitHub through its Connectors feature, allowing the AI to read and analyze your repository's content to answer questions and assist with development tasks. 
Native Integration (OpenAI Connectors)
This feature is available to ChatGPT Plus, Pro, and Team users, with Enterprise and Edu support also available. It allows ChatGPT to act as an intelligent co-pilot for your codebase, providing cited answers based on your actual files and documentation. 
Capabilities:
Knowledge Retrieval: Ask questions about your code, file structures, and documentation.
Code Analysis: Get help with error detection, understanding complex logic, and identifying improvements.
Documentation Assistance: Automatically generate documentation or summarize pull requests (PRs). 
How to Connect:
Go to Settings > Apps & Connectors in ChatGPT.
Select the GitHub connector tile and click Connect.
You will be redirected to GitHub to authorize the connection and select the specific repositories (public or private) you want ChatGPT to access.
Once connected, you can start a new chat and ask questions about your repository's content, with ChatGPT citing file paths in its responses. 
Note: The connector currently only provides read access; it cannot directly push code or create pull requests. For write capabilities, alternative integrations or the legacy Codex product are needed. 
Third-Party Integrations and Tools
For more advanced automation and specific workflow integration, several third-party services and community tools are available: 
Automation Platforms: Tools like Zapier or Appy Pie Automate can link specific triggers and actions between ChatGPT and GitHub, such as using ChatGPT to analyze new commits or generate issues from product specs.
GitHub Actions: Various community-developed GitHub Actions are available in the GitHub Marketplace. These can automate tasks like running AI-powered code reviews on every pull request.
Custom Bots/Agents: Developers can build custom solutions, such as a bot that responds to GitHub issues using ChatGPT, by leveraging the OpenAI API and platforms like flows.network. 
These integrations help streamline development workflows by bringing AI reasoning directly into your version control system. 
