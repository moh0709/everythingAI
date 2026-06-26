# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/client-admin-smoke.spec.ts >> EverythingAI Client/Admin UX smoke agent >> admin dashboard is clearly separated from client workspace
- Location: smoke/client-admin-smoke.spec.ts:77:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Recommended command')
Expected: visible
Received: undefined

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Recommended command')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e6]
      - strong [ref=e8]: EverythingAI
      - generic [ref=e9]: ADMIN DASHBOARD
    - navigation [ref=e10]:
      - button "Dashboard" [ref=e11] [cursor=pointer]
      - button "Files & Content" [ref=e12] [cursor=pointer]
      - button "Planning" [ref=e13] [cursor=pointer]
      - button "Ask AI" [ref=e14] [cursor=pointer]
      - button "Agent Connectors" [ref=e15] [cursor=pointer]
      - button "Analytics" [ref=e16] [cursor=pointer]
      - button "Settings" [active] [ref=e17] [cursor=pointer]
    - generic [ref=e18]: "Provider: Ollama"
  - main [ref=e20]:
    - generic [ref=e21]:
      - generic [ref=e22]:
        - text: ADMIN DASHBOARD
        - heading "Operator Control Center" [level=1] [ref=e23]:
          - img [ref=e24]
          - text: Operator Control Center
        - paragraph [ref=e34]: Manage source paths, file indexing, extracted file content, AI providers, planning rules, execution safety, analytics, and knowledge operations. Normal users should use the Client Workspace.
      - generic [ref=e35]:
        - generic [ref=e36]:
          - img [ref=e37]
          - textbox "Search indexed files and extracted content" [ref=e40]: README.md
        - button "Search Files" [ref=e41] [cursor=pointer]
        - button "Planning Rules" [ref=e42] [cursor=pointer]
        - button "Analytics" [ref=e43] [cursor=pointer]
        - button "Automation status" [ref=e44] [cursor=pointer]:
          - img [ref=e45]
    - generic [ref=e47]: Searching EverythingAI...
    - generic [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - heading "Advanced Settings" [level=1] [ref=e51]:
            - img [ref=e52]
            - text: Advanced Settings
          - paragraph [ref=e55]: Configure local API connection, AI providers, admin-only agent connectors, planning policy, and operator scope.
        - generic [ref=e56]:
          - button "Refresh Models" [ref=e57] [cursor=pointer]
          - button "Test Saved Connection" [ref=e58] [cursor=pointer]
          - button "Save AI Settings" [ref=e59] [cursor=pointer]
      - generic [ref=e60]: Searching EverythingAI...
      - generic [ref=e61]:
        - heading "Local API & Workspace" [level=2] [ref=e62]
        - paragraph [ref=e63]: These values are stored locally in the browser and control how this admin UI connects to the local API.
        - generic [ref=e64]:
          - generic [ref=e65]:
            - text: API Base URL
            - textbox "API Base URL" [ref=e66]: http://127.0.0.1:4100
          - generic [ref=e67]:
            - text: API Token
            - textbox "API Token" [ref=e68]: replace-with-your-local-development-token
          - generic [ref=e69]:
            - text: Default Folder Path
            - textbox "Default Folder Path" [ref=e70]
          - generic [ref=e71]:
            - text: Destination Folder / Planning Label
            - textbox "Destination Folder / Planning Label" [ref=e72]: Organized Files
        - generic [ref=e73]:
          - button "Save Local Settings" [ref=e74] [cursor=pointer]
          - generic [ref=e75]: 0 scoped path(s)
      - generic [ref=e76]:
        - heading "AI Provider Configuration" [level=2] [ref=e77]
        - generic [ref=e78]:
          - generic [ref=e79]:
            - text: Filter providers
            - textbox "Filter providers" [ref=e80]:
              - /placeholder: Search provider...
          - generic [ref=e81]:
            - checkbox "Enable remote providers through server policy" [ref=e82]
            - text: Enable remote providers through server policy
        - generic [ref=e83]:
          - button "Ollama Run models locally" [ref=e84] [cursor=pointer]:
            - img [ref=e85]
            - strong [ref=e88]: Ollama
            - generic [ref=e89]: Run models locally
          - button "OpenAI Disabled by policy" [disabled] [ref=e90]:
            - img [ref=e91]
            - strong [ref=e93]: OpenAI
            - generic [ref=e94]: Disabled by policy
          - button "Anthropic Disabled by policy" [disabled] [ref=e95]:
            - img [ref=e96]
            - strong [ref=e106]: Anthropic
            - generic [ref=e107]: Disabled by policy
          - button "OpenRouter Disabled by policy" [disabled] [ref=e108]:
            - img [ref=e109]
            - strong [ref=e114]: OpenRouter
            - generic [ref=e115]: Disabled by policy
          - button "Cerebras Disabled by policy" [disabled] [ref=e116]:
            - img [ref=e117]
            - strong [ref=e119]: Cerebras
            - generic [ref=e120]: Disabled by policy
          - button "Mistral Disabled by policy" [disabled] [ref=e121]:
            - img [ref=e122]
            - strong [ref=e124]: Mistral
            - generic [ref=e125]: Disabled by policy
          - button "Google AI Disabled by policy" [disabled] [ref=e126]:
            - img [ref=e127]
            - strong [ref=e130]: Google AI
            - generic [ref=e131]: Disabled by policy
          - button "DeepSeek Disabled by policy" [disabled] [ref=e132]:
            - img [ref=e133]
            - strong [ref=e136]: DeepSeek
            - generic [ref=e137]: Disabled by policy
          - button "Groq Disabled by policy" [disabled] [ref=e138]:
            - img [ref=e139]
            - strong [ref=e141]: Groq
            - generic [ref=e142]: Disabled by policy
          - button "xAI Disabled by policy" [disabled] [ref=e143]:
            - img [ref=e144]
            - strong [ref=e154]: xAI
            - generic [ref=e155]: Disabled by policy
          - button "Moonshot / Kimi Disabled by policy" [disabled] [ref=e156]:
            - img [ref=e157]
            - strong [ref=e159]: Moonshot / Kimi
            - generic [ref=e160]: Disabled by policy
          - button "Together AI Disabled by policy" [disabled] [ref=e161]:
            - img [ref=e162]
            - strong [ref=e166]: Together AI
            - generic [ref=e167]: Disabled by policy
          - button "Fireworks AI Disabled by policy" [disabled] [ref=e168]:
            - img [ref=e169]
            - strong [ref=e171]: Fireworks AI
            - generic [ref=e172]: Disabled by policy
          - button "Perplexity Disabled by policy" [disabled] [ref=e173]:
            - img [ref=e174]
            - strong [ref=e177]: Perplexity
            - generic [ref=e178]: Disabled by policy
          - button "Azure OpenAI Disabled by policy" [disabled] [ref=e179]:
            - img [ref=e180]
            - strong [ref=e182]: Azure OpenAI
            - generic [ref=e183]: Disabled by policy
          - button "LM Studio Disabled by policy" [disabled] [ref=e184]:
            - img [ref=e185]
            - strong [ref=e187]: LM Studio
            - generic [ref=e188]: Disabled by policy
          - button "Custom OpenAI Disabled by policy" [disabled] [ref=e189]:
            - img [ref=e190]
            - strong [ref=e194]: Custom OpenAI
            - generic [ref=e195]: Disabled by policy
      - generic [ref=e196]:
        - heading "Ollama Configuration" [level=2] [ref=e197]:
          - img [ref=e198]
          - text: Ollama Configuration
        - generic [ref=e201]:
          - generic [ref=e202]:
            - text: Endpoint URL
            - textbox "Endpoint URL" [ref=e203]: http://127.0.0.1:11434
          - generic [ref=e204]:
            - text: Model
            - combobox "Model" [ref=e205]:
              - option "Llama 2" [selected]
              - option "Mistral"
              - option "CodeLlama"
              - option "Qwen 3.5 2B"
              - option "Nomic Embed Text"
          - generic [ref=e206]:
            - text: "Temperature: 0.2"
            - 'slider "Temperature: 0.2" [ref=e207]': "0.2"
          - generic [ref=e208]:
            - text: Max Tokens
            - spinbutton "Max Tokens" [ref=e209]: "192"
          - generic [ref=e210]:
            - text: Timeout MS
            - spinbutton "Timeout MS" [ref=e211]: "120000"
      - generic [ref=e212]:
        - generic [ref=e213]:
          - generic [ref=e214]:
            - heading "Admin Agent Connectors" [level=2] [ref=e215]:
              - img [ref=e216]
              - text: Admin Agent Connectors
            - paragraph [ref=e219]: Configure local coding/agent tools for admin/operator workflows only. These connectors are not exposed in the Client Workspace.
          - generic [ref=e220]:
            - button "Refresh Bridge" [ref=e221] [cursor=pointer]
            - button "Detect All" [ref=e222] [cursor=pointer]
        - generic [ref=e223]:
          - img [ref=e224]
          - text: "Phase 8.3 connector closeout gates pending: 0/2 primary connector(s) ready · 4/12 total setup checks complete"
        - generic [ref=e226]:
          - generic [ref=e227]:
            - strong [ref=e228]: Execution is disabled by default
            - paragraph [ref=e229]:
              - text: Local agent probes require
              - code [ref=e230]: EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true
              - text: . Agent chat also requires
              - code [ref=e231]: EVERYTHINGAI_AGENT_CHAT_ENABLED=true
              - text: .
          - generic [ref=e232]:
            - strong [ref=e233]: Safe bridge boundary
            - paragraph [ref=e234]: The browser cannot submit arbitrary shell commands. Only saved connector commands can be probed or used, and command arguments are constrained.
        - generic [ref=e235]:
          - generic [ref=e236]:
            - strong [ref=e237]:
              - img [ref=e238]
              - text: Connector Health Summary
            - paragraph [ref=e240]: 0 detected · 0 missing after detection · 0 version probe(s) passed.
          - generic [ref=e241]:
            - strong [ref=e242]:
              - img [ref=e243]
              - text: Phase 8.3A scope
            - paragraph [ref=e246]: Primary setup targets are Codex and Claude Code. OpenCode, Kilo Code, Cline, Aider, and Continue stay documented as not installed until explicitly installed.
        - generic [ref=e247]:
          - generic [ref=e248]:
            - strong [ref=e249]:
              - img [ref=e250]
              - text: Primary connector progress snapshot
            - paragraph [ref=e254]: Admin-only readiness snapshot for Codex and Claude Code. Ready only when all setup checks pass and chat remains disabled.
          - generic [ref=e255]:
            - strong [ref=e256]:
              - img [ref=e257]
              - text: Codex readiness
            - paragraph [ref=e259]: 2/6 setup checks complete · not ready yet
          - generic [ref=e260]:
            - strong [ref=e261]:
              - img [ref=e262]
              - text: Claude Code readiness
            - paragraph [ref=e264]: 2/6 setup checks complete · not ready yet
        - generic [ref=e265]:
          - generic [ref=e266]:
            - strong [ref=e267]:
              - img [ref=e268]
              - text: Controlled setup checklist
            - paragraph [ref=e272]: Use the checklist on each Codex and Claude Code card before treating a connector as ready. Detection and version probes are allowed; connector chat remains blocked until explicitly approved.
          - generic [ref=e273]:
            - strong [ref=e274]:
              - img [ref=e275]
              - text: Operator guardrails
            - paragraph [ref=e277]: Do not enable chat, workspace context, or bridge execution for general users. Client Workspace must stay provider-only and must never expose Agent Connectors.
        - generic [ref=e278]:
          - generic [ref=e279]:
            - strong [ref=e280]:
              - img [ref=e281]
              - text: Connector-specific setup notes
            - paragraph [ref=e284]: Codex and Claude Code cards now include command, external app session, troubleshooting, and ready-to-advance notes for controlled operator setup.
          - generic [ref=e285]:
            - strong [ref=e286]:
              - img [ref=e287]
              - text: Readiness rule
            - paragraph [ref=e290]: A connector is not considered ready until the checklist passes and chat remains disabled. Optional connectors remain documented as not installed until explicitly configured.
        - generic [ref=e291]:
          - generic [ref=e292]:
            - strong [ref=e293]:
              - img [ref=e294]
              - text: Local diagnostics refresh order
            - paragraph [ref=e296]: "Use this order: Refresh Bridge, Detect, enable only for controlled diagnostics, Probe Version, then confirm connector chat remains disabled."
          - generic [ref=e297]:
            - strong [ref=e298]:
              - img [ref=e299]
              - text: Smoke runner cleanup reminder
            - paragraph [ref=e301]: If local smoke reports port 5151 is already responding, stop the old UI dev server before rerunning the smoke runner.
        - generic [ref=e302]: "Bridge: disabled · Chat: disabled · Platform: linux · Probe timeout: 12000ms"
        - generic [ref=e303]:
          - generic [ref=e304]:
            - generic [ref=e305]:
              - generic [ref=e306]:
                - strong [ref=e307]:
                  - img [ref=e308]
                  - text: Codex
                - paragraph [ref=e310]: OpenAI Codex app / CLI connector
                - generic [ref=e311]: Phase 8.3A targetdisabledcodexsafe command
              - button "Collapse" [ref=e312] [cursor=pointer]
            - generic [ref=e313]:
              - img [ref=e314]
              - text: "Phase 8.3A target pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e316]: "Next action: Run Detect for this Phase 8.3A connector."
            - generic [ref=e317]:
              - img [ref=e318]
              - text: "Controlled setup readiness: 2/6 setup checks complete. Complete detection, safe version probe, and chat-disabled checks before advancing this connector."
            - generic [ref=e322]:
              - generic [ref=e323]:
                - heading "Controlled setup checklist" [level=3] [ref=e324]:
                  - img [ref=e325]
                  - text: Controlled setup checklist
                - paragraph [ref=e329]: Phase 8.3A allows controlled detection and version probing for Codex and Claude Code only. Chat remains disabled unless explicitly approved later.
                - generic [ref=e330]:
                  - generic [ref=e331]:
                    - strong [ref=e332]:
                      - img [ref=e333]
                      - text: Saved command is safe
                    - paragraph [ref=e336]: Command passed browser-side bridge safety inspection.
                  - generic [ref=e337]:
                    - strong [ref=e338]:
                      - img [ref=e339]
                      - text: CLI detected on PATH
                    - paragraph [ref=e341]: Run Detect to confirm the local CLI is installed and reachable.
                  - generic [ref=e342]:
                    - strong [ref=e343]:
                      - img [ref=e344]
                      - text: Connector enabled only for controlled diagnostics
                    - paragraph [ref=e346]: Keep disabled until you are ready to run controlled local diagnostics.
                  - generic [ref=e347]:
                    - strong [ref=e348]:
                      - img [ref=e349]
                      - text: Bridge execution flag verified locally
                    - paragraph [ref=e351]: Set EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true only for controlled local testing.
                  - generic [ref=e352]:
                    - strong [ref=e353]:
                      - img [ref=e354]
                      - text: Version probe completed
                    - paragraph [ref=e356]: Run Probe Version after detect, enable, and bridge flag checks are complete.
                  - generic [ref=e357]:
                    - strong [ref=e358]:
                      - img [ref=e359]
                      - text: Connector chat remains disabled
                    - paragraph [ref=e362]: Chat execution remains off as required for Phase 8.3A.
              - generic [ref=e363]:
                - heading "Connector-specific setup notes" [level=3] [ref=e364]:
                  - img [ref=e365]
                  - text: Connector-specific setup notes
                - paragraph [ref=e368]: These notes are operator guidance only. They do not enable execution, chat, or workspace context.
                - generic [ref=e369]:
                  - generic [ref=e370]:
                    - strong [ref=e371]: Recommended command
                    - paragraph [ref=e372]: Use the installed Codex CLI command only, for example codex. Keep the Command field simple and avoid chained commands.
                  - generic [ref=e373]:
                    - strong [ref=e374]: External app session
                    - paragraph [ref=e375]: The connector expects Codex access to be handled by the external Codex app or CLI session. The connector card only stores setup metadata.
                  - generic [ref=e376]:
                    - strong [ref=e377]: Troubleshooting path
                    - paragraph [ref=e378]: If Detect fails, confirm Codex is installed, restart the local API process so PATH is refreshed, then run Refresh Bridge and Detect again.
                  - generic [ref=e379]:
                    - strong [ref=e380]: Ready-to-advance rule
                    - paragraph [ref=e381]: Treat Codex as ready only after safe command, PATH detection, enabled diagnostics, bridge flag, version probe, and chat-disabled checks are complete.
              - generic [ref=e382]:
                - checkbox "Enable connector" [ref=e383]
                - text: Enable connector
              - generic [ref=e384]:
                - checkbox "Enable chat for this connector" [ref=e385]
                - text: Enable chat for this connector
              - generic [ref=e386]:
                - checkbox "Allow EverythingAI context" [ref=e387]
                - text: Allow EverythingAI context
              - generic [ref=e388]:
                - text: Command
                - textbox "Command" [ref=e389]: codex
              - generic [ref=e390]:
                - text: Mode
                - textbox "Mode" [ref=e391]: local-cli
              - generic [ref=e392]:
                - text: Auth Strategy
                - textbox "Auth Strategy" [ref=e393]: codex-app
              - generic [ref=e394]:
                - text: Chat Mode
                - combobox "Chat Mode" [ref=e395]:
                  - option "stdin" [selected]
                  - option "argv"
                  - option "disabled"
              - generic [ref=e396]:
                - text: Chat Args
                - textbox "Chat Args" [ref=e397]: exec -
              - generic [ref=e398]:
                - text: Max Input Characters
                - spinbutton "Max Input Characters" [ref=e399]: "12000"
              - generic [ref=e400]:
                - text: Timeout MS
                - spinbutton "Timeout MS" [ref=e401]: "120000"
              - generic [ref=e402]:
                - button "Detect" [ref=e403] [cursor=pointer]
                - button "Probe Version" [disabled] [ref=e404]
          - generic [ref=e405]:
            - generic [ref=e406]:
              - generic [ref=e407]:
                - strong [ref=e408]:
                  - img [ref=e409]
                  - text: Kilo Code
                - paragraph [ref=e411]: Kilo Code agent connector
                - generic [ref=e412]: not installed until configureddisabledkilosafe command
              - button "Configure" [ref=e413] [cursor=pointer]
            - generic [ref=e414]:
              - img [ref=e415]
              - text: "Pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e417]: "Next action: Run Detect All when reviewing optional connectors."
          - generic [ref=e418]:
            - generic [ref=e419]:
              - generic [ref=e420]:
                - strong [ref=e421]:
                  - img [ref=e422]
                  - text: OpenCode
                - paragraph [ref=e424]: OpenCode agent connector
                - generic [ref=e425]: not installed until configureddisabledopencodesafe command
              - button "Configure" [ref=e426] [cursor=pointer]
            - generic [ref=e427]:
              - img [ref=e428]
              - text: "Pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e430]: "Next action: Run Detect All when reviewing optional connectors."
          - generic [ref=e431]:
            - generic [ref=e432]:
              - generic [ref=e433]:
                - strong [ref=e434]:
                  - img [ref=e435]
                  - text: Claude Code
                - paragraph [ref=e437]: Claude Code connector
                - generic [ref=e438]: Phase 8.3A targetdisabledclaudesafe command
              - button "Configure" [ref=e439] [cursor=pointer]
            - generic [ref=e440]:
              - img [ref=e441]
              - text: "Phase 8.3A target pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e443]: "Next action: Run Detect for this Phase 8.3A connector."
            - generic [ref=e444]:
              - img [ref=e445]
              - text: "Controlled setup readiness: 2/6 setup checks complete. Complete detection, safe version probe, and chat-disabled checks before advancing this connector."
          - generic [ref=e449]:
            - generic [ref=e450]:
              - generic [ref=e451]:
                - strong [ref=e452]:
                  - img [ref=e453]
                  - text: Aider
                - paragraph [ref=e455]: Aider local CLI connector
                - generic [ref=e456]: not installed until configureddisabledaidersafe command
              - button "Configure" [ref=e457] [cursor=pointer]
            - generic [ref=e458]:
              - img [ref=e459]
              - text: "Pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e461]: "Next action: Run Detect All when reviewing optional connectors."
          - generic [ref=e462]:
            - generic [ref=e463]:
              - generic [ref=e464]:
                - strong [ref=e465]:
                  - img [ref=e466]
                  - text: Continue
                - paragraph [ref=e468]: Continue config bridge
                - generic [ref=e469]: not installed until configureddisabledcontinuesafe command
              - button "Configure" [ref=e470] [cursor=pointer]
            - generic [ref=e471]:
              - img [ref=e472]
              - text: "Pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e474]: "Next action: Run Detect All when reviewing optional connectors."
          - generic [ref=e475]:
            - generic [ref=e476]:
              - generic [ref=e477]:
                - strong [ref=e478]:
                  - img [ref=e479]
                  - text: Cline
                - paragraph [ref=e481]: Cline config bridge
                - generic [ref=e482]: not installed until configureddisabledclinesafe command
              - button "Configure" [ref=e483] [cursor=pointer]
            - generic [ref=e484]:
              - img [ref=e485]
              - text: "Pending detection: Command format is safe, but live PATH detection has not been run in this session."
            - paragraph [ref=e487]: "Next action: Run Detect All when reviewing optional connectors."
        - generic [ref=e488]:
          - img [ref=e489]
          - text: Agent connectors are admin-only. Normal Client Workspace users continue to chat only through the AI provider selected in Admin Settings.
      - generic [ref=e492]:
        - heading "Planning & Execution Policy" [level=2] [ref=e493]:
          - img [ref=e494]
          - text: Planning & Execution Policy
        - paragraph [ref=e496]: These controls govern which action types may be proposed and how strictly execution must be approved.
        - generic [ref=e497]:
          - generic [ref=e498]:
            - text: Planning strategy
            - combobox "Planning strategy" [ref=e499]:
              - option "Safe" [selected]
              - option "Balanced"
              - option "Aggressive"
          - generic [ref=e500]:
            - text: "Confidence threshold: 65%"
            - 'slider "Confidence threshold: 65%" [ref=e501]': "0.65"
          - generic [ref=e502]:
            - checkbox "Allow rename suggestions" [checked] [ref=e503]
            - text: Allow rename suggestions
          - generic [ref=e504]:
            - checkbox "Allow move suggestions" [checked] [ref=e505]
            - text: Allow move suggestions
          - generic [ref=e506]:
            - checkbox "Allow tag suggestions" [checked] [ref=e507]
            - text: Allow tag suggestions
          - generic [ref=e508]:
            - checkbox "Allow category suggestions" [checked] [ref=e509]
            - text: Allow category suggestions
          - generic [ref=e510]:
            - checkbox "Require explicit approval" [checked] [ref=e511]
            - text: Require explicit approval
          - generic [ref=e512]:
            - checkbox "Dry-run only mode" [ref=e513]
            - text: Dry-run only mode
        - generic [ref=e514]: Permanent purge remains forbidden in the local MVP. Execution must stay preview-first, approval-first, and audit-backed.
```

# Test source

```ts
  14  | test.describe('EverythingAI Client/Admin UX smoke agent', () => {
  15  |   test('client workspace clearly separates sources, files, knowledge base, and ask AI', async ({ page }) => {
  16  |     await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  17  |     await expect(page.locator('span.chip:has-text("CLIENT WORKSPACE")')).toBeVisible();
  18  |     await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
  19  |     await expect(page.getByRole('button', { name: 'Sources & Files' })).toBeVisible();
  20  |     await expect(page.getByRole('button', { name: 'Knowledge Base' })).toBeVisible();
  21  |     await expect(page.getByRole('navigation').getByRole('button', { name: 'Ask AI' })).toBeVisible();
  22  |     await expect(page.getByText('Admin Agent Connectors')).toHaveCount(0);
  23  |     await expect(page.getByText('AI Provider Configuration')).toHaveCount(0);
  24  |     await saveScreenshot(page, '01-client-home');
  25  | 
  26  |     await page.getByRole('button', { name: 'Sources & Files' }).click();
  27  |     await expect(page.locator('span.chip:has-text("CLIENT SOURCES & FILE CONTENT")')).toBeVisible();
  28  |     await expect(page.getByRole('heading', { name: 'Sources & Files' })).toBeVisible();
  29  |     await expect(page.getByText('extracted file text', { exact: false })).toBeVisible();
  30  |     await saveScreenshot(page, '02-client-sources-files');
  31  | 
  32  |     await page.getByRole('button', { name: 'Knowledge Base' }).click();
  33  |     await expect(page.locator('span.chip:has-text("CLIENT KNOWLEDGE BASE")')).toBeVisible();
  34  |     await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible();
  35  |     await expect(page.getByText('saved knowledge database', { exact: false })).toBeVisible();
  36  |     await saveScreenshot(page, '03-client-knowledge-base');
  37  | 
  38  |     await page.getByRole('navigation').getByRole('button', { name: 'Ask AI' }).click();
  39  |     await expect(page.getByRole('heading', { name: 'Ask AI about the Knowledge Base' })).toBeVisible();
  40  |     await expect(page.getByText('Knowledge-base chat')).toBeVisible();
  41  |     await saveScreenshot(page, '04-client-ask-ai');
  42  |   });
  43  | 
  44  |   test('client knowledge base search and trust panels render', async ({ page }) => {
  45  |     await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  46  |     await page.getByRole('button', { name: 'Knowledge Base' }).click();
  47  |     await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible();
  48  |     await expect(page.getByText('File Sources')).toBeVisible();
  49  |     await expect(page.getByLabel('Citation inspector summary')).toBeVisible();
  50  |     await expect(page.getByText('Workspace Trust Health')).toBeVisible();
  51  | 
  52  |     const knowledgeSearch = page.getByPlaceholder('Search inside this knowledge page...');
  53  |     await knowledgeSearch.fill('Workspace');
  54  |     await expect(page.getByLabel('Clear knowledge page search')).toBeVisible();
  55  |     await expect(page.getByText(/\d+ match\(es\)/)).toBeVisible();
  56  |     await saveScreenshot(page, '05-client-knowledge-search');
  57  |   });
  58  | 
  59  |   test('client ask view keeps the latest message visible after submit', async ({ page }) => {
  60  |     await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  61  |     await page.getByRole('navigation').getByRole('button', { name: 'Ask AI' }).click();
  62  |     await expect(page.getByRole('heading', { name: 'Ask AI about the Knowledge Base' })).toBeVisible();
  63  | 
  64  |     const smokePrompt = 'Smoke test: confirm what source this answer is based on.';
  65  |     const input = page.getByPlaceholder('Ask about the knowledge base, file content, source context, or extracted documents...');
  66  |     await input.fill(smokePrompt);
  67  |     await page.locator('main').getByRole('button', { name: /^Ask$/ }).click();
  68  | 
  69  |     const userMessage = page.locator('.chat-bubble.user p', { hasText: smokePrompt }).last();
  70  |     await expect(userMessage).toBeVisible();
  71  |     await page.waitForTimeout(1000);
  72  |     await saveScreenshot(page, '05-client-ask-after-message');
  73  | 
  74  |     await expect(userMessage).toBeInViewport();
  75  |   });
  76  | 
  77  |   test('admin dashboard is clearly separated from client workspace', async ({ page }) => {
  78  |     await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
  79  |     await expect(page.getByText('ADMIN DASHBOARD').first()).toBeVisible();
  80  |     await expect(page.getByRole('heading', { name: 'Operator Control Center' })).toBeVisible();
  81  |     await expect(page.getByText('Normal users should use the Client Workspace', { exact: false })).toBeVisible();
  82  |     await saveScreenshot(page, '06-admin-dashboard');
  83  | 
  84  |     const searchBox = page.getByPlaceholder('Search indexed files and extracted content');
  85  |     await searchBox.fill('README.md');
  86  |     await page.getByRole('button', { name: 'Search Files' }).click();
  87  |     await expect(page.getByRole('heading', { name: 'Indexing & Extraction Progress' })).toBeVisible();
  88  |     await expect(page.getByText('1/1 visible')).toBeVisible();
  89  |     await saveScreenshot(page, '07-admin-search-results');
  90  | 
  91  |     await expect(page.getByRole('button', { name: 'Files & Content' })).toBeVisible();
  92  |     await page.getByRole('button', { name: 'Files & Content' }).click();
  93  |     await saveScreenshot(page, '08-admin-files-content');
  94  | 
  95  |     await page.getByRole('button', { name: 'Settings' }).click();
  96  |     await expect(page.getByRole('heading', { name: 'Advanced Settings' })).toBeVisible();
  97  |     await expect(page.getByText('AI Provider Configuration')).toBeVisible();
  98  |     await expect(page.getByText('Enable remote providers through server policy')).toBeVisible();
  99  |     await expect(page.getByText('Admin Agent Connectors')).toBeVisible();
  100 |     await expect(page.getByText('Connector Health Summary')).toBeVisible();
  101 |     await expect(page.getByText('Phase 8.3A scope')).toBeVisible();
  102 |     await expect(page.getByText('Primary connector progress snapshot')).toBeVisible();
  103 |     await expect(page.getByText('Codex readiness')).toBeVisible();
  104 |     await expect(page.getByText('Claude Code readiness')).toBeVisible();
  105 |     await expect(page.getByText('Ready only when all setup checks pass and chat remains disabled')).toBeVisible();
  106 |     await expect(page.getByText('Controlled setup checklist').first()).toBeVisible();
  107 |     await expect(page.getByText('Operator guardrails')).toBeVisible();
  108 |     await expect(page.getByText('Connector-specific setup notes').first()).toBeVisible();
  109 |     await expect(page.getByText('Readiness rule')).toBeVisible();
  110 |     await expect(page.getByText('Local diagnostics refresh order')).toBeVisible();
  111 |     await expect(page.getByText('Refresh Bridge, Detect, enable only for controlled diagnostics, Probe Version')).toBeVisible();
  112 |     await expect(page.getByText('Smoke runner cleanup reminder')).toBeVisible();
  113 |     await expect(page.getByText('port 5151 is already responding')).toBeVisible();
> 114 |     await expect(page.getByText('Recommended command')).toBeVisible();
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  115 |     await expect(page.getByText('External app session', { exact: true })).toBeVisible();
  116 |     await expect(page.getByText('Troubleshooting path')).toBeVisible();
  117 |     await expect(page.getByText('Ready-to-advance rule')).toBeVisible();
  118 |     await expect(page.getByText('Detection and version probes are allowed; connector chat remains blocked until explicitly approved')).toBeVisible();
  119 |     await expect(page.getByText('Do not enable chat, workspace context, or bridge execution for general users')).toBeVisible();
  120 |     await expect(page.getByText('Controlled setup readiness').first()).toBeVisible();
  121 |     await expect(page.getByText('Saved command is safe')).toBeVisible();
  122 |     await expect(page.getByText('CLI detected on PATH')).toBeVisible();
  123 |     await expect(page.getByText('Connector chat remains disabled', { exact: true })).toBeVisible();
  124 |     await expect(page.getByText('Primary setup targets are Codex and Claude Code')).toBeVisible();
  125 |     await expect(page.getByText('OpenCode, Kilo Code, Cline, Aider, and Continue stay documented as not installed', { exact: false })).toBeVisible();
  126 |     await expect(page.getByText('OpenAI Codex app / CLI connector')).toBeVisible();
  127 |     await expect(page.getByText('Claude Code connector')).toBeVisible();
  128 |     await expect(page.getByText('OpenCode agent connector')).toBeVisible();
  129 |     await expect(page.getByText('Client Workspace users continue to chat only through the AI provider selected in Admin Settings', { exact: false })).toBeVisible();
  130 | 
  131 |     const remotePolicyCheckbox = page.getByLabel('Enable remote providers through server policy');
  132 |     if (!(await remotePolicyCheckbox.isChecked())) {
  133 |       await remotePolicyCheckbox.check();
  134 |     }
  135 |     await page.getByRole('button', { name: 'OpenAI Remote model provider', exact: true }).click();
  136 |     await expect(page.getByText('API key lifecycle')).toBeVisible();
  137 |     await expect(page.getByText('No key configured')).toBeVisible();
  138 |     await page.getByLabel('OpenAI API key').fill('smoke-test-replacement-key');
  139 |     await expect(page.getByText('New key staged', { exact: true })).toBeVisible();
  140 | 
  141 |     await saveScreenshot(page, '09-admin-settings-providers-agents');
  142 |   });
  143 | 
  144 |   test('backend API is reachable for real smoke testing', async ({ request }) => {
  145 |     const authHeaderValue = process.env.EVERYTHINGAI_DEV_TOKEN || 'local-dev-token';
  146 |     const response = await request.get(`${API_URL}/api/status`, {
  147 |       headers: { Authorization: `Bearer ${authHeaderValue}` },
  148 |     });
  149 |     expect(response.status()).toBeLessThan(500);
  150 |   });
  151 | });
  152 | 
```