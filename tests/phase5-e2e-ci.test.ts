import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 5: End-to-End Testing & CI/CD Pipeline Configuration", () => {
  const rootDir = process.cwd();

  describe("5.1 Playwright E2E Test Suite", () => {
    it("has playwright.config.ts configured with base URL and web server settings", () => {
      const configPath = resolve(rootDir, "playwright.config.ts");
      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, "utf-8");
      expect(content).toContain('testDir: "./e2e"');
      expect(content).toContain("chromium");
      expect(content).toContain("webServer");
    });

    it("includes comprehensive E2E specs in e2e/ directory", () => {
      const authSpecPath = resolve(rootDir, "e2e/auth.spec.ts");
      const workflowSpecPath = resolve(rootDir, "e2e/interaction-workflow.spec.ts");
      const complianceSpecPath = resolve(rootDir, "e2e/compliance-safety.spec.ts");

      expect(existsSync(authSpecPath)).toBe(true);
      expect(existsSync(workflowSpecPath)).toBe(true);
      expect(existsSync(complianceSpecPath)).toBe(true);

      // Verify Auth spec tests login, redirect, and logout
      const authContent = readFileSync(authSpecPath, "utf-8");
      expect(authContent).toContain("redirects unauthenticated visitor");
      expect(authContent).toContain("completes full login flow");
      expect(authContent).toContain("signs out securely");

      // Verify Interaction workflow spec tests AI draft, save, and audit trail
      const workflowContent = readFileSync(workflowSpecPath, "utf-8");
      expect(workflowContent).toContain("populates interaction fields via AI Assistant");
      expect(workflowContent).toContain("Regulatory Audit Trail (FDA 21 CFR Part 11)");
      expect(workflowContent).toContain("edits an existing draft via conversational instruction");

      // Verify Compliance spec tests adverse events and prompt injection defense
      const complianceContent = readFileSync(complianceSpecPath, "utf-8");
      expect(complianceContent).toContain("detects adverse events and displays pharmacovigilance compliance banner");
      expect(complianceContent).toContain("rejects adversarial prompt injection attempts");
    });
  });

  describe("5.2 GitHub Actions CI/CD Pipeline", () => {
    it("has .github/workflows/ci.yml with complete quality and deployment steps", () => {
      const workflowPath = resolve(rootDir, ".github/workflows/ci.yml");
      expect(existsSync(workflowPath)).toBe(true);

      const content = readFileSync(workflowPath, "utf-8");

      // Triggers
      expect(content).toContain("branches: [main]");
      expect(content).toContain("pull_request");

      // PostgreSQL Service Container
      expect(content).toContain("image: postgres:16-alpine");
      expect(content).toContain("5432:5432");

      // Key pipeline verification steps
      expect(content).toContain("actions/setup-node@v4");
      expect(content).toContain("npm ci");
      expect(content).toContain("npm run prisma:generate");
      expect(content).toContain("npx prisma migrate deploy");
      expect(content).toContain("npx tsc --noEmit");
      expect(content).toContain("npm test");
      expect(content).toContain("npm run build");
      expect(content).toContain("npx playwright test");
    });
  });

  describe("5.3 Production Deployment & Scripts", () => {
    it("has next.config.mjs configured for server external packages", () => {
      const nextConfigPath = resolve(rootDir, "next.config.mjs");
      expect(existsSync(nextConfigPath)).toBe(true);

      const content = readFileSync(nextConfigPath, "utf-8");
      expect(content).toContain("serverComponentsExternalPackages");
      expect(content).toContain("@prisma/client");
    });

    it("package.json contains test:e2e script and Playwright dependency", () => {
      const packagePath = resolve(rootDir, "package.json");
      const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));

      expect(pkg.scripts["test:e2e"]).toBe("playwright test");
      expect(pkg.scripts["prisma:deploy"]).toBe("prisma migrate deploy");
      expect(pkg.devDependencies["@playwright/test"]).toBeDefined();
    });
  });
});

