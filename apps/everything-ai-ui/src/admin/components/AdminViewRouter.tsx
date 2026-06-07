import type { AppStatus, IndexedFile, Suggestion } from '../../api';
import type { AgentBridgeStatus, AgentDetectionResult, ProviderModels, ProviderName, ProviderSettings } from '../../providerSettingsApi';
import type { SourcePathRecord } from '../../sourcePathsApi';
import type { AdminSection } from '../types';
import { AnalyticsView } from './AnalyticsView';
import { AskAIView } from './AskAIView';
import { DashboardView } from './DashboardView';
import { ExplorerView } from './ExplorerView';
import { PlanningView, type PreviewRecord } from './PlanningView';
import { SettingsView } from './SettingsView';
import type { ApiOptions } from '../../api';

type FilePreview = {
  file?: IndexedFile & { extracted_text?: string };
  insight?: { summary?: string; classification?: string } | null;
  previewText?: string;
  extracted_text?: string;
};

type ChatSource = {
  filename?: string;
  absolute_path?: string;
  snippet?: string;
  score?: number;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: ChatSource[];
};

type AuditEvent = {
  id: string;
  created_at: string;
  entity_type?: string;
  event_type?: string;
};

type AdminViewRouterProps = {
  section: AdminSection;
  options: ApiOptions;
  status: AppStatus | null;
  audit: AuditEvent[];
  files: IndexedFile[];
  filteredFiles: IndexedFile[];
  selectedFile?: IndexedFile;
  selectedPreview?: FilePreview | null;
  setSelectedFileId: (fileId: string) => void;
  query: string;
  setQuery: (query: string) => void;
  searchEverything: () => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filterExtension: string;
  setFilterExtension: (extension: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  extensionOptions: string[];
  suggestions: Suggestion[];
  previews: PreviewRecord[];
  selectedSuggestionIds: Set<string>;
  setSelectedSuggestionIds: (ids: Set<string>) => void;
  createPreview: (suggestion: Suggestion) => void;
  previewSelected: () => void;
  executePreview: (preview: PreviewRecord) => void;
  executeSelectedPreviews: () => void;
  deepAnalysis: () => void;
  busy: boolean;
  openSettings: () => void;
  destinationFolder: string;
  setDestinationFolder: (value: string) => void;
  totalSize: number;
  fileTypes: Record<string, number>;
  folderPath: string;
  setFolderPath: (value: string) => void;
  selectFolder: () => void;
  addTypedSourcePath: () => void;
  setSection: (section: AdminSection) => void;
  sourcePaths: SourcePathRecord[];
  rescanSource: (source: SourcePathRecord) => void;
  pauseSource: (source: SourcePathRecord) => void;
  resumeSource: (source: SourcePathRecord) => void;
  removeSource: (source: SourcePathRecord) => void;
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  saveLocalSettings: () => void;
  providerSettings: ProviderSettings | null;
  providerModels: ProviderModels | null;
  saveAiSettings: (settings: ProviderSettings) => void;
  testAiProvider: (provider: ProviderName) => void;
  refreshModels: () => void;
  connectionMessage: string;
  connectionStatus: 'idle' | 'ok' | 'error';
  saveSettingsFeedback: string;
  agentBridgeStatus: AgentBridgeStatus | null;
  agentDetectionResults: Record<string, AgentDetectionResult>;
  refreshAgentBridgeStatus: () => void;
  detectAgent: (agentId: string) => void;
  detectAllAgents: () => void;
  probeAgent: (agentId: string) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (updater: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) => void;
};

export function AdminViewRouter(props: AdminViewRouterProps) {
  switch (props.section) {
    case 'dashboard':
      return <DashboardView
        files={props.files}
        suggestions={props.suggestions}
        totalSize={props.totalSize}
        fileTypes={props.fileTypes}
        folderPath={props.folderPath}
        setFolderPath={props.setFolderPath}
        selectFolder={props.selectFolder}
        addTypedSourcePath={props.addTypedSourcePath}
        deepAnalysis={props.deepAnalysis}
        setSection={props.setSection}
        busy={props.busy}
        sourcePaths={props.sourcePaths}
        rescanSource={props.rescanSource}
        pauseSource={props.pauseSource}
        resumeSource={props.resumeSource}
        removeSource={props.removeSource}
      />;

    case 'explorer':
      return <ExplorerView
        files={props.filteredFiles}
        allFiles={props.files}
        selectedFile={props.selectedFile}
        selectedPreview={props.selectedPreview}
        setSelectedFileId={props.setSelectedFileId}
        query={props.query}
        setQuery={props.setQuery}
        searchEverything={props.searchEverything}
        showFilters={props.showFilters}
        setShowFilters={props.setShowFilters}
        filterExtension={props.filterExtension}
        setFilterExtension={props.setFilterExtension}
        filterStatus={props.filterStatus}
        setFilterStatus={props.setFilterStatus}
        extensionOptions={props.extensionOptions}
      />;

    case 'planning':
      return <PlanningView
        files={props.files}
        suggestions={props.suggestions}
        previews={props.previews}
        selectedSuggestionIds={props.selectedSuggestionIds}
        setSelectedSuggestionIds={props.setSelectedSuggestionIds}
        createPreview={props.createPreview}
        previewSelected={props.previewSelected}
        executePreview={props.executePreview}
        executeSelectedPreviews={props.executeSelectedPreviews}
        deepAnalysis={props.deepAnalysis}
        busy={props.busy}
        openSettings={props.openSettings}
        destinationFolder={props.destinationFolder}
        setDestinationFolder={props.setDestinationFolder}
      />;

    case 'analytics':
      return <AnalyticsView status={props.status} audit={props.audit} />;

    case 'settings':
      return <SettingsView
        baseUrl={props.baseUrl}
        setBaseUrl={props.setBaseUrl}
        token={props.token}
        setToken={props.setToken}
        folderPath={props.folderPath}
        setFolderPath={props.setFolderPath}
        destinationFolder={props.destinationFolder}
        setDestinationFolder={props.setDestinationFolder}
        saveLocalSettings={props.saveLocalSettings}
        sourcePaths={props.sourcePaths}
        providerSettings={props.providerSettings}
        providerModels={props.providerModels}
        saveAiSettings={props.saveAiSettings}
        testAiProvider={props.testAiProvider}
        refreshModels={props.refreshModels}
        connectionMessage={props.connectionMessage}
        connectionStatus={props.connectionStatus}
        saveSettingsFeedback={props.saveSettingsFeedback}
        agentBridgeStatus={props.agentBridgeStatus}
        agentDetectionResults={props.agentDetectionResults}
        refreshAgentBridgeStatus={props.refreshAgentBridgeStatus}
        detectAgent={props.detectAgent}
        detectAllAgents={props.detectAllAgents}
        probeAgent={props.probeAgent}
        busy={props.busy}
      />;

    case 'askai':
      return <AskAIView
        options={props.options}
        chatMessages={props.chatMessages}
        setChatMessages={props.setChatMessages}
      />;

    default:
      return null;
  }
}

export default AdminViewRouter;
