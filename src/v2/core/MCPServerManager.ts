/**
 * MCP Server Manager for Yama V2
 * Manages lifecycle and health of Bitbucket and Jira MCP servers
 */

import { MCPServersConfig } from "../types/config.types.js";
import { MCPServerError } from "../types/v2.types.js";
import { MCPStatus, MCPServerStatus } from "../types/mcp.types.js";

export class MCPServerManager {
  // MCP servers are managed entirely by NeuroLink
  // No need to track tools locally
  private initialized = false;

  /**
   * Validate timeout value
   * Accepts timeout in milliseconds
   */
  private parseTimeout(timeout?: number): number {
    if (!timeout || timeout <= 0) {
      // Logic: if undefined, null, 0, or negative, use default
      // Note: !timeout handles 0, undefined, null, NaN
      const defaultTimeout = 120000; // 2 minutes
      if (timeout !== undefined) {
        console.warn(
          `Invalid timeout value: ${timeout}, using default ${defaultTimeout}ms`,
        );
      }
      return defaultTimeout;
    }
    return timeout;
  }

  /**
   * Setup all MCP servers in NeuroLink
   * Bitbucket is always enabled, Jira is optional based on config
   */
  async setupMCPServers(
    neurolink: any,
    config: MCPServersConfig,
  ): Promise<void> {
    console.log("🔌 Setting up MCP servers...");

    const timeoutMs = this.parseTimeout(config.initializationTimeout);
    console.log(`   ⏱️  MCP initialization timeout: ${timeoutMs}ms`);

    // Setup Bitbucket MCP (always enabled)
    await this.setupBitbucketMCP(neurolink, timeoutMs);

    // Setup Jira MCP (optional)
    if (config.jira.enabled) {
      await this.setupJiraMCP(neurolink, timeoutMs);
    } else {
      console.log("   ⏭️  Jira MCP disabled in config");
    }

    this.initialized = true;
    console.log("✅ MCP servers configured\n");
  }

  /**
   * Setup Bitbucket MCP server (hardcoded, always enabled)
   */
  private async setupBitbucketMCP(
    neurolink: any,
    timeoutMs: number,
  ): Promise<void> {
    try {
      console.log("   🔧 Registering Bitbucket MCP server...");

      // Verify environment variables
      if (
        !process.env.BITBUCKET_USERNAME ||
        !process.env.BITBUCKET_TOKEN ||
        !process.env.BITBUCKET_BASE_URL
      ) {
        throw new MCPServerError(
          "Missing required environment variables: BITBUCKET_USERNAME, BITBUCKET_TOKEN, or BITBUCKET_BASE_URL",
        );
      }

      // Hardcoded Bitbucket MCP configuration
      await neurolink.addExternalMCPServer("bitbucket", {
        command: "npx",
        args: ["-y", "@nexus2520/bitbucket-mcp-server"],
        transport: "stdio",
        timeout: timeoutMs,
        env: {
          BITBUCKET_USERNAME: process.env.BITBUCKET_USERNAME,
          BITBUCKET_TOKEN: process.env.BITBUCKET_TOKEN,
          BITBUCKET_BASE_URL: process.env.BITBUCKET_BASE_URL,
        },
      });

      console.log("   ✅ Bitbucket MCP server registered and tools available");
    } catch (error) {
      throw new MCPServerError(
        `Failed to setup Bitbucket MCP server: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Setup Jira MCP server (hardcoded, optionally enabled)
   */
  private async setupJiraMCP(neurolink: any, timeoutMs: number): Promise<void> {
    try {
      console.log("   🔧 Registering Jira MCP server...");

      // Validate required Jira environment variables
      const jiraEmail = process.env.JIRA_EMAIL;
      const jiraToken = process.env.JIRA_API_TOKEN;
      const jiraBaseUrl = process.env.JIRA_BASE_URL;

      if (!jiraEmail || !jiraToken || !jiraBaseUrl) {
        console.warn(
          "   ⚠️  Missing Jira environment variables (JIRA_EMAIL, JIRA_API_TOKEN, or JIRA_BASE_URL)",
        );
        console.warn("   Skipping Jira integration...");
        return;
      }

      // Hardcoded Jira MCP configuration
      await neurolink.addExternalMCPServer("jira", {
        command: "npx",
        args: ["-y", "@nexus2520/jira-mcp-server"],
        transport: "stdio",
        timeout: timeoutMs,
        env: {
          JIRA_EMAIL: process.env.JIRA_EMAIL,
          JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
          JIRA_BASE_URL: process.env.JIRA_BASE_URL,
        },
      });

      console.log("   ✅ Jira MCP server registered and tools available");
    } catch (error) {
      // Jira is optional, so we warn instead of throwing
      console.warn(
        `   ⚠️  Failed to setup Jira MCP server: ${(error as Error).message}`,
      );
      console.warn("   Continuing without Jira integration...");
    }
  }
}
