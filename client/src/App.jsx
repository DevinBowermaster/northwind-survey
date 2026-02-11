import React, { useState, useEffect, useRef } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function App() {
  // API URL based on environment
  const API_URL = import.meta.env.DEV 
    ? 'http://localhost:3000' 
    : 'https://northwind-survey-backend.onrender.com';

  const { authState } = useOktaAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientFilter, setClientFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientContacts, setClientContacts] = useState([]);
  const [selectingContactFor, setSelectingContactFor] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [surveyStats, setSurveyStats] = useState(null);
  const [recentResponses, setRecentResponses] = useState([]);
  const [allResponses, setAllResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responsesFilter, setResponsesFilter] = useState('all'); // all, good, needs-attention
  const [responsesPage, setResponsesPage] = useState(1);
  const [expandedResponses, setExpandedResponses] = useState(new Set());
  const [surveyTemplates, setSurveyTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  const [selectedSurveyType, setSelectedSurveyType] = useState('Quarterly');
  const [pendingSurveys, setPendingSurveys] = useState([]);
  const [archivedSurveys, setArchivedSurveys] = useState([]);
  const [expandedArchives, setExpandedArchives] = useState(new Set());
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [contractHealthData, setContractHealthData] = useState([]);
  const [contractHealthLoading, setContractHealthLoading] = useState(false);
  const [expandedContractClients, setExpandedContractClients] = useState(new Set());
  const [contractHealthSortBy, setContractHealthSortBy] = useState('name'); // 'name' or 'usage'
  const RESPONSES_PER_PAGE = 10;
  const clientScrollPositionRef = useRef(0);

  // Admin email list (must match server.js)
  const ADMIN_EMAILS = ['wylie@northwind.us', 'devin@northwind.us'];

  useEffect(() => {
    fetchClients();
    fetchStats();
    fetchSurveyStatistics();
    fetchTemplates();
  }, []);

  // Get user info from Okta and check admin status
  useEffect(() => {
    if (authState?.isAuthenticated && authState?.idToken?.claims) {
      const email = authState.idToken.claims.email;
      const name = authState.idToken.claims.name || email?.split('@')[0];
      
      setUserEmail(email);
      setUserName(name);
      setIsAdmin(email && ADMIN_EMAILS.includes(email.toLowerCase()));
    } else {
      setUserEmail(null);
      setUserName(null);
      setIsAdmin(false);
    }
  }, [authState]);

  // Fetch all responses when switching to responses view
  useEffect(() => {
    if (activeView === 'responses') {
      fetchAllResponses();
    }
  }, [activeView]);

  // Fetch pending surveys when switching to pending view
  useEffect(() => {
    if (activeView === 'pending') {
      fetchPendingSurveys();
    }
  }, [activeView]);

  // Fetch archived surveys when switching to archives view
  useEffect(() => {
    if (activeView === 'archives') {
      fetchArchivedSurveys();
    }
  }, [activeView]);

  // Fetch audit logs when switching to audit logs view
  useEffect(() => {
    if (activeView === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeView]);

  // Fetch contract health data when switching to contract health view
  useEffect(() => {
    if (activeView === 'contract-health') {
      fetchContractHealth();
    }
  }, [activeView]);

  const fetchContractHealth = async () => {
    try {
      setContractHealthLoading(true);
      const response = await fetch(`${API_URL}/api/contract-usage/all`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contract health data');
      }
      
      const data = await response.json();
      // API returns array directly, not wrapped in object
      setContractHealthData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching contract health:', error);
      setContractHealthData([]);
    } finally {
      setContractHealthLoading(false);
    }
  };

  const toggleContractClient = (clientId) => {
    setExpandedContractClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const fetchClients = async () => {
    try {
      if (typeof window !== 'undefined') {
        clientScrollPositionRef.current = window.scrollY || 0;
      }
      setLoading(true);
      const response = await fetch(`${API_URL}/api/clients`);
      const data = await response.json();
      setClients(data);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, clientScrollPositionRef.current || 0);
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats/by-type`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSurveyStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/surveys/statistics`);
      const data = await response.json();
      setSurveyStats(data.stats);
      setRecentResponses(data.recent_responses);
    } catch (err) {
      console.error('Error fetching survey statistics:', err);
    }
  };

  const fetchAllResponses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/surveys/responses`);
      const data = await response.json();
      setAllResponses(data);
    } catch (err) {
      console.error('Error fetching all responses:', err);
    }
  };

  const fetchPendingSurveys = async () => {
    try {
      const response = await fetch(`${API_URL}/api/surveys/pending`);
      const data = await response.json();
      setPendingSurveys(data.surveys || []);
    } catch (err) {
      console.error('Error fetching pending surveys:', err);
      setPendingSurveys([]);
    }
  };

  const fetchArchivedSurveys = async () => {
    try {
      const response = await fetch(`${API_URL}/api/surveys/archived`);
      const data = await response.json();
      setArchivedSurveys(data.organized || {});
    } catch (err) {
      console.error('Error fetching archived surveys:', err);
      setArchivedSurveys({});
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit-logs?userEmail=${encodeURIComponent(userEmail || '')}`);
      
      if (response.status === 403) {
        alert('❌ Admin access required');
        setAuditLogs([]);
        return;
      }
      
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setAuditLogs([]);
    }
  };

  const toggleResponse = (responseId) => {
    setExpandedResponses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(responseId)) {
        newSet.delete(responseId);
      } else {
        newSet.add(responseId);
      }
      return newSet;
    });
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/survey-templates`);
      const data = await response.json();
      setSurveyTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const saveTemplate = async (template) => {
    try {
      const url = template.id 
        ? `${API_URL}/api/survey-templates/${template.id}`
        : `${API_URL}/api/survey-templates`;
      
      const response = await fetch(url, {
        method: template.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('✅ Template saved successfully');
        fetchTemplates();
        setEditingTemplate(null);
      }
    } catch (err) {
      alert('❌ Failed to save template');
    }
  };

  const fetchClientContacts = async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}/contacts`);
      const data = await response.json();
      setClientContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setClientContacts([]);
    }
  };

  const syncCompanies = async () => {
    if (!confirm('Sync companies from Autotask? This may take a minute.')) return;
    
    try {
      setSyncing(true);
      const response = await fetch(`${API_URL}/api/sync/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName })
      });
      
      if (response.status === 403) {
        alert('❌ Admin access required');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\nTotal companies: ${result.totalCompanies}`);
        fetchClients();
        fetchStats();
      } else {
        alert(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Failed to sync companies');
      console.error('Error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const syncContacts = async () => {
    if (!confirm('Sync contacts from Autotask? This may take a minute.')) return;
    
    try {
      setSyncing(true);
      const response = await fetch(`${API_URL}/api/sync/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName })
      });
      
      if (response.status === 403) {
        alert('❌ Admin access required');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\nTotal contacts: ${result.totalContacts}`);
        fetchClients();
      } else {
        alert(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Failed to sync contacts');
      console.error('Error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const exportContacts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/export`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '').trim()
        : `managed-clients-${new Date().toISOString().split('T')[0]}.csv`;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.message === 'No managed clients found' ? 'No managed clients to export.' : 'Failed to export contacts. Please try again.');
    }
  };

  const deleteAllSurveyData = async () => {
    const confirmMessage = '⚠️ WARNING: This will permanently delete ALL survey responses, reset all client scores to 0, and clear last_survey dates.\n\nThis action cannot be undone!\n\nAre you absolutely sure you want to proceed?';
    
    if (!confirm(confirmMessage)) return;
    
    // Double confirmation
    if (!confirm('⚠️ FINAL WARNING: This will delete ALL survey data. Click OK to proceed or Cancel to abort.')) return;
    
    try {
      setSyncing(true);
      const response = await fetch(`${API_URL}/api/admin/delete-all-surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName })
      });
      
      if (response.status === 403) {
        alert('❌ Admin access required');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\nDeleted ${result.deleted_surveys} surveys\nReset ${result.reset_scores} client scores\nCleared ${result.reset_dates} last_survey dates`);
        // Refresh all data
        fetchClients();
        fetchStats();
        fetchSurveyStatistics();
        fetchAllResponses();
      } else {
        alert(`❌ Delete failed: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Failed to delete survey data');
      console.error('Error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const syncContractHealth = async () => {
    if (!confirm('Sync Contract Health from Autotask? This runs in the background and may take a few minutes.')) return;
    
    if (!userEmail) {
      alert('❌ You must be logged in to run sync. Sign in and try again.');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch(`${API_URL}/api/admin/sync-contract-health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName })
      });
      
      if (response.status === 401) {
        alert('❌ Not authenticated. Please log in and try again.');
        return;
      }
      if (response.status === 403) {
        alert('❌ Admin access required');
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (parseErr) {
        console.error('Sync response was not JSON:', parseErr);
        alert(`❌ Server returned an error (status ${response.status}). Check that the backend is running and CORS is allowed.`);
        return;
      }

      if (result.success) {
        alert(result.message || 'Sync started. Refresh the Contract Health tab in 2–3 minutes.');
        fetchContractHealth();
      } else {
        alert(`❌ Contract Health sync failed: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error syncing contract health:', error);
      const msg = error?.message || String(error);
      alert(`❌ Could not start sync: ${msg}\n\nIf the sync already ran on the server, refresh the Contract Health tab to see updated amounts.`);
    } finally {
      setSyncing(false);
    }
  };

  const setPrimaryContact = async (clientId, contactId) => {
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}/set-primary-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, userEmail, userName })
      });
      
      if (response.status === 403) {
        alert('❌ Admin access required');
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Primary contact set to: ${result.contact.name}`);
        setSelectingContactFor(null);
        fetchClients();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Failed to set primary contact');
      console.error('Error:', error);
    }
  };

  const getContactCount = (clientId) => {
    // This would need to be fetched from server - for now return null
    return null;
  };

  const getTotalCount = () => {
    if (!stats) return 0;
    return stats.reduce((sum, s) => sum + s.count, 0);
  };

  const getManagedCount = () => {
    if (!stats) return 0;
    const managed = stats.find(s => s.company_type === 'managed');
    return managed ? managed.count : 0;
  };

  const getBreakFixCount = () => {
    if (!stats) return 0;
    const breakfix = stats.find(s => s.company_type === 'break-fix');
    return breakfix ? breakfix.count : 0;
  };

  const getAverageScore = () => {
    if (!stats) return 0;
    const totalScore = stats.reduce((sum, s) => sum + (s.avg_score || 0) * s.count, 0);
    const totalCount = getTotalCount();
    return totalCount > 0 ? (totalScore / totalCount).toFixed(1) : 0;
  };

  const lineChartData = {
    labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
    datasets: [{
      label: 'Average Score',
      data: [8.1, 8.3, 8.0, 8.4, 8.6, 8.8, 8.2],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 5,
      pointBackgroundColor: '#3b82f6'
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af' }
      },
      x: {
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const pieChartData = {
    labels: ['Quarterly (45)', 'Post-Ticket (30)', 'Post-Project (15)'],
    datasets: [{
      data: [45, 30, 15],
      backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
      borderColor: '#1f2937',
      borderWidth: 2
    }]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#fff', padding: 15 }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1
      }
    }
  };

  const getStatusColor = (score) => {
    if (!score || score === 0) return 'bg-gray-600';
    if (score >= 9) return 'bg-green-600';
    if (score >= 7) return 'bg-blue-600';
    return 'bg-red-600';
  };

  const getStatusText = (score) => {
    if (!score || score === 0) return 'No Score';
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    return 'Needs Attention';
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Admin Actions */}
      {isAdmin && (
        <div className="lg:col-span-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-red-300 mb-1">⚠️ Admin Actions</h3>
              <p className="text-sm text-red-200">Dangerous operations - use with caution</p>
            </div>
            <button
              onClick={deleteAllSurveyData}
              disabled={syncing}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors text-white"
            >
              {syncing ? '⏳ Deleting...' : '🗑️ Delete All Survey Data'}
            </button>
          </div>
        </div>
      )}

      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Clients</span>
            <span className="text-3xl">👥</span>
          </div>
          <div className="text-3xl font-bold text-white">{getTotalCount()}</div>
          <div className="text-sm text-gray-400 mt-1">{getManagedCount()} managed</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg Satisfaction</span>
            <span className="text-3xl">⭐</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {surveyStats?.average_score || '—'}{surveyStats?.average_score ? '/10' : ''}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {surveyStats?.completed ? `From ${surveyStats.completed} responses` : 'No responses yet'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Response Rate</span>
            <span className="text-3xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {surveyStats ? Math.round((surveyStats.completed / surveyStats.total_surveys) * 100) || 0 : 0}%
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {surveyStats?.completed || 0} of {surveyStats?.total_surveys || 0} surveys
          </div>
        </div>

        <div 
          onClick={() => setActiveView('pending')}
          className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs sm:text-sm">Pending Surveys</span>
            <span className="text-2xl sm:text-3xl">📧</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl sm:text-3xl font-bold text-white">{surveyStats?.pending || 0}</div>
            <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs sm:text-sm">View →</span>
          </div>
          <div className="text-xs sm:text-sm text-yellow-400 mt-1">Awaiting response</div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Satisfaction Trend</h3>
        <div style={{ height: '300px' }}>
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Survey Breakdown</h3>
        <div style={{ height: '300px' }}>
          <Pie data={pieChartData} options={pieChartOptions} />
        </div>
      </div>

      <div className="lg:col-span-3 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Recent Responses</h3>
        {recentResponses.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No survey responses yet. Send surveys to your managed clients to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {recentResponses.slice(0, 5).map(response => (
              <div key={response.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${response.avg_score >= 7 ? 'text-green-500' : 'text-red-500'}`}>
                        {response.avg_score >= 7 ? '✓' : '⚠'}
                      </span>
                      <span className="font-semibold text-white">{response.client_name}</span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600">
                        {response.survey_type}
                      </span>
                    </div>
                    {response.what_we_do_well && (
                      <p className="text-sm text-gray-300 mt-2">"{response.what_we_do_well}"</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-blue-400">{Math.round(response.avg_score * 10) / 10}/10</div>
                    <div className="text-xs text-gray-400">{new Date(response.completed_date).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-3 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Upcoming Surveys (Next 30 Days)</h3>
        {clients
          .filter(c => c.company_type === 'managed' && c.next_survey)
          .filter(c => {
            const daysUntil = Math.ceil((new Date(c.next_survey) - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 30;
          })
          .sort((a, b) => new Date(a.next_survey) - new Date(b.next_survey))
          .length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No surveys scheduled in the next 30 days.
          </div>
        ) : (
          <div className="space-y-3">
            {clients
              .filter(c => c.company_type === 'managed' && c.next_survey)
              .filter(c => {
                const daysUntil = Math.ceil((new Date(c.next_survey) - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntil >= 0 && daysUntil <= 30;
              })
              .sort((a, b) => new Date(a.next_survey) - new Date(b.next_survey))
              .map(client => {
                const daysUntil = Math.ceil((new Date(client.next_survey) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={client.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{client.name}</span>
                          {daysUntil === 0 && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-600">
                              Today
                            </span>
                          )}
                          {daysUntil === 1 && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-600">
                              Tomorrow
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          📧 {client.email || 'No email'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-400">
                          {new Date(client.next_survey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-400">
                          {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );

  const renderClients = () => {
    const filteredClients = clients.filter(client => {
      let passesTypeFilter = true;
      if (clientFilter === 'managed') passesTypeFilter = client.company_type === 'managed';
      else if (clientFilter === 'break-fix') passesTypeFilter = client.company_type === 'break-fix';
      
      const passesSearch = searchTerm === '' || 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return passesTypeFilter && passesSearch;
    });

    const managedCount = clients.filter(c => c.company_type === 'managed').length;
    const breakFixCount = clients.filter(c => c.company_type === 'break-fix').length;

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Client Management</h2>
            <p className="text-gray-400">Showing {filteredClients.length} of {clients.length} clients</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isAdmin && (
              <button 
                onClick={syncCompanies}
                disabled={syncing}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? '⏳ Syncing...' : '🔄 Sync Companies'}
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={syncContacts}
                disabled={syncing}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? '⏳ Syncing...' : '👥 Sync Contacts'}
              </button>
            )}
            <button
              onClick={exportContacts}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 touch-manipulation"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Managed Clients
            </button>
            <button 
              onClick={fetchClients}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 touch-manipulation"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search by company name, email, or contact person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setClientFilter('all')}
            className={`px-3 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              clientFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Clients ({clients.length})
          </button>
          
          <button
            onClick={() => setClientFilter('managed')}
            className={`px-3 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              clientFilter === 'managed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🎯 Managed ({managedCount})
          </button>
          
          <button
            onClick={() => setClientFilter('break-fix')}
            className={`px-3 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              clientFilter === 'break-fix'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🔧 Break-Fix ({breakFixCount})
          </button>
        </div>


        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchTerm ? `No clients found matching "${searchTerm}"` : 'No clients found in this category'}
            </div>
          ) : (
            filteredClients.map(client => (
              <div 
                key={client.id || client.autotask_id} 
                className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-white break-words">{client.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(client.score)}`}>
                        {getStatusText(client.score)}
                      </span>
                      {client.company_type === 'managed' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600">
                          🎯 Managed
                        </span>
                      )}
                      {client.survey_frequency && [30, 60, 90].includes(client.survey_frequency) && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600">
                          📧 Surveys Enabled
                        </span>
                      )}
                      {client.has_pending_survey === 1 && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-600">
                          ⏳ Pending Survey
                        </span>
                      )}
                      {client.contact_count > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600">
                          👥 {client.contact_count} {client.contact_count === 1 ? 'contact' : 'contacts'}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      {client.contact_person && (
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-500">Contact:</span> {client.contact_person}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-gray-500">Email:</span>{' '}
                        {client.email ? (
                          <span className="text-blue-400">{client.email}</span>
                        ) : (
                          <span className="text-red-400">No email on file</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            setSelectingContactFor(client);
                            await fetchClientContacts(client.id || client.autotask_id);
                          }}
                          className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          👥 Select Contact
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {client.score > 0 && (
                    <div className="text-center sm:text-right sm:ml-4">
                      <div className="text-3xl font-bold text-blue-400">{client.score}</div>
                      <div className="text-sm text-gray-400">Score</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderResponses = () => {
    // Filter responses
    const filteredResponses = allResponses.filter(response => {
      if (responsesFilter === 'good') return response.avg_score >= 7;
      if (responsesFilter === 'needs-attention') return response.avg_score < 7;
      return true;
    });

    // Paginate
    const totalPages = Math.ceil(filteredResponses.length / RESPONSES_PER_PAGE);
    const startIdx = (responsesPage - 1) * RESPONSES_PER_PAGE;
    const paginatedResponses = filteredResponses.slice(startIdx, startIdx + RESPONSES_PER_PAGE);

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Survey Responses</h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Showing {startIdx + 1}-{Math.min(startIdx + RESPONSES_PER_PAGE, filteredResponses.length)} of {filteredResponses.length}
            </p>
          </div>
          <button 
            onClick={fetchAllResponses}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 touch-manipulation"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setResponsesFilter('all'); setResponsesPage(1); }}
            className={`min-h-[44px] px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              responsesFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All ({allResponses.length})
          </button>
          <button
            onClick={() => { setResponsesFilter('good'); setResponsesPage(1); }}
            className={`min-h-[44px] px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              responsesFilter === 'good'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ✓ Good (7+) ({allResponses.filter(r => r.avg_score >= 7).length})
          </button>
          <button
            onClick={() => { setResponsesFilter('needs-attention'); setResponsesPage(1); }}
            className={`min-h-[44px] px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              responsesFilter === 'needs-attention'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ⚠ Needs Attention (&lt;7) ({allResponses.filter(r => r.avg_score < 7).length})
          </button>
        </div>

        {allResponses.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-white mb-2">No Responses Yet</h3>
            <p className="text-gray-400">
              Survey responses will appear here once clients complete their surveys.
            </p>
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No Results</h3>
            <p className="text-gray-400">
              No responses match the selected filter.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedResponses.map(response => {
                const isExpanded = expandedResponses.has(response.id);
                
                return (
                  <div 
                    key={response.id} 
                    className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    {/* Accordion Header - Always Visible */}
                    <div 
                      className="p-4 sm:p-6 cursor-pointer touch-manipulation"
                      onClick={() => toggleResponse(response.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <span className="text-gray-400 shrink-0">{isExpanded ? '▼' : '▶'}</span>
                            <h3 className="text-base sm:text-xl font-bold text-white break-words">{response.client_name}</h3>
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-blue-600 shrink-0">
                              {response.survey_type}
                            </span>
                            <span className={`text-xl sm:text-2xl shrink-0 ${response.avg_score >= 7 ? 'text-green-500' : 'text-red-500'}`}>
                              {response.avg_score >= 7 ? '✓' : '⚠'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 ml-6 sm:ml-8">
                            Completed: {new Date(response.completed_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                            {Math.round(response.avg_score * 10) / 10}/10
                          </div>
                          <div className="text-xs text-gray-400">Average Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Accordion Content - Expandable */}
                    {isExpanded && (
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                        {/* Rating Scores */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 pb-4 border-b border-gray-700">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">{response.overall_satisfaction}</div>
                            <div className="text-xs text-gray-400">Overall</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">{response.response_time}</div>
                            <div className="text-xs text-gray-400">Response</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">{response.technical_knowledge}</div>
                            <div className="text-xs text-gray-400">Technical</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">{response.communication}</div>
                            <div className="text-xs text-gray-400">Communication</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">{response.recommend_score}</div>
                            <div className="text-xs text-gray-400">NPS</div>
                          </div>
                        </div>

                        {/* Feedback Sections */}
                        <div className="space-y-3">
                          {response.what_we_do_well && (
                            <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded-lg p-4">
                              <div className="flex items-start gap-2">
                                <span className="text-green-500 text-lg">✅</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-green-300 mb-1">What we do well:</p>
                                  <p className="text-gray-200">{response.what_we_do_well}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {response.what_to_improve && (
                            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4">
                              <div className="flex items-start gap-2">
                                <span className="text-yellow-500 text-lg">💡</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-yellow-300 mb-1">What to improve:</p>
                                  <p className="text-gray-200">{response.what_to_improve}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {response.additional_comments && (
                            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
                              <div className="flex items-start gap-2">
                                <span className="text-blue-500 text-lg">💬</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-blue-300 mb-1">Additional comments:</p>
                                  <p className="text-gray-200">{response.additional_comments}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Archive Button */}
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const surveyId = response.id;
                              if (!confirm('Archive this survey response?')) return;
                              
                              try {
                                const archiveResponse = await fetch(`${API_URL}/api/surveys/${surveyId}/archive`, {
                                  method: 'POST'
                                });
                                const result = await archiveResponse.json();
                                
                                if (result.success) {
                                  alert('✅ Survey archived successfully');
                                  fetchAllResponses(); // Refresh responses
                                  fetchSurveyStatistics(); // Update stats
                                } else {
                                  alert(`❌ Error: ${result.error}`);
                                }
                              } catch (error) {
                                alert('❌ Failed to archive survey');
                                console.error('Error:', error);
                              }
                            }}
                            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
                          >
                            📦 Archive
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setResponsesPage(p => Math.max(1, p - 1))}
                  disabled={responsesPage === 1}
                  className="min-h-[44px] px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  ← Previous
                </button>
                <span className="text-gray-400 text-sm sm:text-base order-last w-full text-center sm:order-none sm:w-auto">
                  Page {responsesPage} of {totalPages}
                </span>
                <button
                  onClick={() => setResponsesPage(p => Math.min(totalPages, p + 1))}
                  disabled={responsesPage === totalPages}
                  className="min-h-[44px] px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPendingSurveys = () => {
    const resendSurvey = async (surveyId) => {
      if (!confirm('Resend survey email to this client?')) return;
      
      try {
        const response = await fetch(`${API_URL}/api/surveys/${surveyId}/resend`, {
          method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
          alert(`✅ ${result.message}`);
          fetchPendingSurveys(); // Refresh the list
          fetchSurveyStatistics(); // Update stats
        } else {
          alert(`❌ Error: ${result.error}`);
        }
      } catch (error) {
        alert('❌ Failed to resend survey');
        console.error('Error:', error);
      }
    };

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Pending Surveys</h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Surveys sent but not yet completed ({pendingSurveys.length} total)
            </p>
          </div>
          <button 
            onClick={fetchPendingSurveys}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 touch-manipulation"
          >
            🔄 Refresh
          </button>
        </div>

        {pendingSurveys.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">No Pending Surveys</h3>
            <p className="text-gray-400">
              All surveys have been completed or no surveys have been sent yet.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-4">
              {pendingSurveys.map(survey => (
                <div key={survey.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate">{survey.client_name}</div>
                      {survey.contact_person && (
                        <div className="text-sm text-gray-400 truncate">{survey.contact_person}</div>
                      )}
                      <div className="text-sm text-blue-400 truncate mt-1">{survey.email || 'No email'}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                      survey.days_pending >= 14 ? 'bg-red-600 text-white' : survey.days_pending >= 7 ? 'bg-yellow-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {survey.days_pending} {survey.days_pending === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-400">
                    <span>
                      Sent: {new Date(survey.sent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white">{survey.survey_type}</span>
                  </div>
                  <button
                    onClick={() => resendSurvey(survey.id)}
                    className="mt-3 w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-white touch-manipulation"
                  >
                    📧 Resend
                  </button>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Sent Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Days Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Survey Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {pendingSurveys.map(survey => (
                      <tr key={survey.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{survey.client_name}</div>
                          {survey.contact_person && (
                            <div className="text-sm text-gray-400">{survey.contact_person}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-400">{survey.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {new Date(survey.sent_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(survey.sent_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            survey.days_pending >= 14 
                              ? 'bg-red-600 text-white' 
                              : survey.days_pending >= 7 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}>
                            {survey.days_pending} {survey.days_pending === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600">
                            {survey.survey_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => resendSurvey(survey.id)}
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
                          >
                            📧 Resend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderArchives = () => {
    const toggleArchiveSection = (key) => {
      setExpandedArchives(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    };

    const getMonthName = (month) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return months[parseInt(month) - 1] || month;
    };

    const clientNames = Object.keys(archivedSurveys).sort();

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Archived Surveys</h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Archived survey responses organized by client, year, and month
            </p>
          </div>
          <button 
            onClick={fetchArchivedSurveys}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 touch-manipulation"
          >
            🔄 Refresh
          </button>
        </div>

        {clientNames.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-white mb-2">No Archived Surveys</h3>
            <p className="text-gray-400">
              Archived surveys will appear here once you archive survey responses.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {clientNames.map(clientName => {
              const clientKey = `client-${clientName}`;
              const isClientExpanded = expandedArchives.has(clientKey);
              const yearMonths = Object.keys(archivedSurveys[clientName]).sort().reverse();

              return (
                <div key={clientName} className="bg-gray-800 rounded-lg border border-gray-700">
                  {/* Client Header */}
                  <div 
                    className="p-4 min-h-[48px] cursor-pointer hover:bg-gray-700 transition-colors touch-manipulation flex items-center"
                    onClick={() => toggleArchiveSection(clientKey)}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-gray-400 shrink-0">{isClientExpanded ? '▼' : '▶'}</span>
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">{clientName}</h3>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-600">
                          {yearMonths.length} {yearMonths.length === 1 ? 'period' : 'periods'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Client Content - Years/Months */}
                  {isClientExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {yearMonths.map(yearMonth => {
                        const yearMonthKey = `${clientKey}-${yearMonth}`;
                        const isYearMonthExpanded = expandedArchives.has(yearMonthKey);
                        const yearMonthData = archivedSurveys[clientName][yearMonth];
                        const surveys = yearMonthData.surveys || [];

                        return (
                          <div key={yearMonth} className="bg-gray-700 rounded-lg border border-gray-600">
                            {/* Year/Month Header */}
                            <div 
                              className="p-3 min-h-[44px] cursor-pointer hover:bg-gray-600 transition-colors touch-manipulation flex items-center"
                              onClick={() => toggleArchiveSection(yearMonthKey)}
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-gray-400 text-sm shrink-0">{isYearMonthExpanded ? '▼' : '▶'}</span>
                                  <span className="text-sm sm:text-base font-semibold text-white">
                                    {getMonthName(yearMonthData.month)} {yearMonthData.year}
                                  </span>
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600">
                                    {surveys.length} {surveys.length === 1 ? 'survey' : 'surveys'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Surveys List */}
                            {isYearMonthExpanded && (
                              <div className="px-3 pb-3 space-y-2">
                                {surveys.map(survey => (
                                  <div key={survey.id} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600">
                                            {survey.survey_type}
                                          </span>
                                          <span className="text-sm text-gray-300">
                                            Archived: {new Date(survey.archived_date).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                        {survey.completed_date && (
                                          <p className="text-sm text-gray-400 mb-2">
                                            Completed: {new Date(survey.completed_date).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })}
                                          </p>
                                        )}
                                      </div>
                                      {survey.avg_score && (
                                        <div className="text-right">
                                          <div className="text-2xl font-bold text-blue-400">
                                            {Math.round(survey.avg_score * 10) / 10}/10
                                          </div>
                                          <div className="text-xs text-gray-400">Average</div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Survey Details */}
                                    {(survey.overall_satisfaction || survey.what_we_do_well || survey.what_to_improve) && (
                                      <div className="mt-3 pt-3 border-t border-gray-500">
                                        {survey.overall_satisfaction && (
                                          <div className="grid grid-cols-5 gap-2 mb-3">
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-white">{survey.overall_satisfaction}</div>
                                              <div className="text-xs text-gray-400">Overall</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-white">{survey.response_time}</div>
                                              <div className="text-xs text-gray-400">Response</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-white">{survey.technical_knowledge}</div>
                                              <div className="text-xs text-gray-400">Technical</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-white">{survey.communication}</div>
                                              <div className="text-xs text-gray-400">Communication</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-white">{survey.recommend_score}</div>
                                              <div className="text-xs text-gray-400">NPS</div>
                                            </div>
                                          </div>
                                        )}

                                        <div className="space-y-2">
                                          {survey.what_we_do_well && (
                                            <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded p-2">
                                              <p className="text-xs font-medium text-green-300 mb-1">What we do well:</p>
                                              <p className="text-sm text-gray-200">{survey.what_we_do_well}</p>
                                            </div>
                                          )}

                                          {survey.what_to_improve && (
                                            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded p-2">
                                              <p className="text-xs font-medium text-yellow-300 mb-1">What to improve:</p>
                                              <p className="text-sm text-gray-200">{survey.what_to_improve}</p>
                                            </div>
                                          )}

                                          {survey.additional_comments && (
                                            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded p-2">
                                              <p className="text-xs font-medium text-blue-300 mb-1">Additional comments:</p>
                                              <p className="text-sm text-gray-200">{survey.additional_comments}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAuditLog = () => {
    const formatLogValue = (log, key) => {
      let val = log[key];
      if (!val) return '—';
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed;
      } catch (e) {
        return val;
      }
    };

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Audit Log</h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Admin actions and changes ({auditLogs.length} entries)
            </p>
          </div>
          <button 
            onClick={fetchAuditLogs}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 touch-manipulation"
          >
            🔄 Refresh
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 sm:p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-white mb-2">No Audit Logs</h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Audit logs will appear here once admin actions are performed.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-4">
              {auditLogs.map(log => {
                const oldValueDisplay = formatLogValue(log, 'old_value');
                const newValueDisplay = formatLogValue(log, 'new_value');
                return (
                  <div key={log.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600">{log.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white mb-1">{log.user_name || log.user_email}</div>
                    <div className="text-xs text-gray-400 mb-2">{log.user_email}</div>
                    {log.entity_name && (
                      <div className="text-sm text-gray-300 mb-2">
                        {log.entity_name} <span className="text-gray-500">({log.entity_type} #{log.entity_id})</span>
                      </div>
                    )}
                    {(oldValueDisplay !== '—' || newValueDisplay !== '—') && (
                      <div className="space-y-2 text-xs">
                        {oldValueDisplay !== '—' && (
                          <div>
                            <span className="text-gray-500">Old: </span>
                            <pre className="text-gray-300 bg-gray-900 p-2 rounded mt-1 overflow-x-auto max-h-24">{oldValueDisplay}</pre>
                          </div>
                        )}
                        {newValueDisplay !== '—' && (
                          <div>
                            <span className="text-gray-500">New: </span>
                            <pre className="text-gray-300 bg-gray-900 p-2 rounded mt-1 overflow-x-auto max-h-24">{newValueDisplay}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Old Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {auditLogs.map(log => {
                      let oldValueDisplay = null;
                      let newValueDisplay = null;
                      try {
                        if (log.old_value) {
                          const parsed = JSON.parse(log.old_value);
                          oldValueDisplay = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed;
                        }
                        if (log.new_value) {
                          const parsed = JSON.parse(log.new_value);
                          newValueDisplay = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed;
                        }
                      } catch (e) {
                        oldValueDisplay = log.old_value;
                        newValueDisplay = log.new_value;
                      }
                      return (
                        <tr key={log.id} className="hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {new Date(log.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{log.user_name || log.user_email}</div>
                            <div className="text-xs text-gray-400">{log.user_email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600">{log.action}</span>
                          </td>
                          <td className="px-6 py-4">
                            {log.entity_name ? (
                              <div>
                                <div className="text-sm text-white">{log.entity_name}</div>
                                <div className="text-xs text-gray-400">{log.entity_type} #{log.entity_id}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {oldValueDisplay ? (
                              <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded max-w-xs overflow-auto">{oldValueDisplay}</pre>
                            ) : (
                              <span className="text-sm text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {newValueDisplay ? (
                              <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded max-w-xs overflow-auto">{newValueDisplay}</pre>
                            ) : (
                              <span className="text-sm text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const [contractHealthDetailClient, setContractHealthDetailClient] = useState(null);
  const [contractHealthDetailData, setContractHealthDetailData] = useState(null);
  const [contractHealthDetailLoading, setContractHealthDetailLoading] = useState(false);
  const [contractHealthExportClient, setContractHealthExportClient] = useState(null);
  const [contractHealthExportData, setContractHealthExportData] = useState(null);
  const [contractHealthExportLoading, setContractHealthExportLoading] = useState(false);
  const [contractHealthExportRange, setContractHealthExportRange] = useState('3'); // '3' | '6' | 'year'
  const [contractHealthExportYear, setContractHealthExportYear] = useState('');

  const formatRevenue = (v) =>
    v != null && v !== 0
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
      : 'N/A';

  const formatMonthName = (monthString) => {
    const [year, month] = monthString.split('-');
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1).toLocaleString('en-US', { month: 'long' });
  };

  const renderContractHealth = () => {
    // Sort data
    const sortedData = [...contractHealthData].sort((a, b) => {
      if (contractHealthSortBy === 'name') {
        return a.clientName.localeCompare(b.clientName);
      } else if (contractHealthSortBy === 'usage') {
        const aPercent = a.currentMonth?.percentage || 0;
        const bPercent = b.currentMonth?.percentage || 0;
        return bPercent - aPercent; // Descending (highest first)
      }
      return 0;
    });

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Contract Health</h2>
            <p className="text-gray-400">Monitor contract usage across all managed clients</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-wrap gap-2">
              <select
                value={contractHealthSortBy}
                onChange={(e) => setContractHealthSortBy(e.target.value)}
                className="min-h-[44px] bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none touch-manipulation"
              >
                <option value="name">Sort by Name</option>
                <option value="usage">Sort by Usage %</option>
              </select>
              <button
                onClick={fetchContractHealth}
                disabled={contractHealthLoading}
                className="min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 touch-manipulation"
              >
                {contractHealthLoading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={syncContractHealth}
                disabled={syncing}
                className="w-full sm:w-auto min-h-[44px] bg-teal-600 hover:bg-teal-700 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {syncing ? '⏳ Syncing...' : '📊 Sync Contract Health'}
              </button>
            )}
          </div>
        </div>

        {contractHealthLoading ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading contract health data...</p>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">No Contract Data</h3>
            <p className="text-gray-400">
              Contract usage data will appear here once synced from Autotask.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-4">
              {sortedData.map(client => {
                const percentage = client.currentMonth?.percentage;
                const usedHours = client.currentMonth?.used || 0;
                const allocatedHours = client.monthlyHours || null;
                let statusColor = 'text-gray-400';
                let statusIcon = '—';
                if (client.contractType === 'Block Hours' && percentage !== null) {
                  if (percentage >= 91) {
                    statusColor = 'text-red-400';
                    statusIcon = '🔴';
                  } else if (percentage >= 71) {
                    statusColor = 'text-yellow-400';
                    statusIcon = '🟡';
                  } else {
                    statusColor = 'text-green-400';
                    statusIcon = '🟢';
                  }
                } else if (client.contractType === 'Unlimited') {
                  statusColor = 'text-purple-400';
                  statusIcon = '♾️';
                }
                const openDetail = () => {
                  setContractHealthDetailClient(client);
                  setContractHealthDetailLoading(true);
                  setActiveView('contract-health-detail');
                  fetch(`${API_URL}/api/contract-usage?clientId=${client.clientId}`)
                    .then((res) => {
                      if (!res.ok) throw new Error('Failed to fetch contract usage history');
                      return res.json();
                    })
                    .then((data) => setContractHealthDetailData(data))
                    .catch((e) => { console.error(e); setContractHealthDetailData(null); })
                    .finally(() => setContractHealthDetailLoading(false));
                };
                const openExport = async () => {
                  try {
                    setContractHealthExportClient(client);
                    setContractHealthExportLoading(true);
                    setContractHealthExportRange('3');
                    setContractHealthExportYear('');
                    const res = await fetch(`${API_URL}/api/contract-usage?clientId=${client.clientId}`);
                    if (!res.ok) throw new Error('Failed to fetch contract usage history');
                    const data = await res.json();
                    setContractHealthExportData(data);
                  } catch (err) {
                    console.error('Error preparing export data:', err);
                    alert('Failed to load contract usage data for export.');
                    setContractHealthExportClient(null);
                    setContractHealthExportData(null);
                  } finally {
                    setContractHealthExportLoading(false);
                  }
                };
                return (
                  <div key={client.clientId} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                    <button
                      type="button"
                      className="w-full text-left font-medium text-white text-base mb-2 underline-offset-2 hover:underline touch-manipulation"
                      onClick={openDetail}
                    >
                      {client.clientName}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {client.contractType === 'Block Hours' ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-600">📦 Block Hours</span>
                      ) : client.contractType === 'Unlimited' ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-600">♾️ Unlimited</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                      <span className={`text-xl ${statusColor}`}>{statusIcon}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-2">
                      <div>
                        <span className="text-gray-500">Block hrs: </span>
                        {client.contractType === 'Block Hours' && allocatedHours ? `${allocatedHours} hrs` : client.contractType === 'Unlimited' ? 'N/A' : '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Hrs billed this month: </span>
                        {client.contractType === 'Unlimited' ? `${usedHours} hrs` : allocatedHours != null ? `${usedHours} hrs` : '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Overage amount: </span>
                        {client.contractType === 'Block Hours' && client.currentMonth?.overageAmount != null && client.currentMonth.overageAmount > 0
                          ? formatRevenue(client.currentMonth.overageAmount)
                          : '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Effective rate: </span>
                        {client.contractType === 'Block Hours' && client.currentMonth?.effectiveHourlyRate != null
                          ? `${formatRevenue(client.currentMonth.effectiveHourlyRate)}/hr`
                          : '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Unlimited contract amount: </span>
                        {client.contractType === 'Unlimited' ? formatRevenue(client.monthlyRevenue) : '—'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={openDetail}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white touch-manipulation"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={openExport}
                        className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white touch-manipulation"
                      >
                        ⬇ Export
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contract Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Block Hours</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Hrs Billed This Month</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Overage Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Effective Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Unlimited Contract Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                  {sortedData.map(client => {
                    const percentage = client.currentMonth?.percentage;
                    let rowBgClass = '';
                    if (client.contractType === 'Block Hours' && percentage !== null) {
                      if (percentage >= 91) rowBgClass = 'bg-red-900 bg-opacity-20';
                      else if (percentage >= 71) rowBgClass = 'bg-yellow-900 bg-opacity-20';
                    }
                    let statusColor = 'text-gray-400';
                    let statusIcon = '—';
                    if (client.contractType === 'Block Hours' && percentage !== null) {
                      if (percentage >= 91) { statusColor = 'text-red-400'; statusIcon = '🔴'; }
                      else if (percentage >= 71) { statusColor = 'text-yellow-400'; statusIcon = '🟡'; }
                      else { statusColor = 'text-green-400'; statusIcon = '🟢'; }
                    } else if (client.contractType === 'Unlimited') {
                      statusColor = 'text-purple-400';
                      statusIcon = '♾️';
                    }
                    const usedHours = client.currentMonth?.used || 0;
                    const allocatedHours = client.monthlyHours || null;
                    return (
                      <tr key={client.clientId} className={`hover:bg-gray-700 transition-colors ${rowBgClass}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            className="text-sm font-medium text-white text-left underline-offset-2 hover:underline"
                            onClick={() => {
                              setContractHealthDetailClient(client);
                              setContractHealthDetailLoading(true);
                              setActiveView('contract-health-detail');
                              fetch(`${API_URL}/api/contract-usage?clientId=${client.clientId}`)
                                .then((res) => {
                                  if (!res.ok) throw new Error('Failed to fetch contract usage history');
                                  return res.json();
                                })
                                .then((data) => setContractHealthDetailData(data))
                                .catch((e) => { console.error(e); setContractHealthDetailData(null); })
                                .finally(() => setContractHealthDetailLoading(false));
                            }}
                          >
                            {client.clientName}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.contractType === 'Block Hours' ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600">📦 Block Hours</span>
                          ) : client.contractType === 'Unlimited' ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600">♾️ Unlimited</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">
                            {client.contractType === 'Block Hours' && allocatedHours != null ? `${allocatedHours} hrs` : client.contractType === 'Unlimited' ? 'N/A' : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">
                            {client.contractType === 'Unlimited' ? `${usedHours} hrs` : allocatedHours != null ? `${usedHours} hrs` : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">
                            {client.contractType === 'Block Hours' && client.currentMonth?.overageAmount != null && client.currentMonth.overageAmount > 0
                              ? formatRevenue(client.currentMonth.overageAmount)
                              : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">
                            {client.contractType === 'Block Hours' && client.currentMonth?.effectiveHourlyRate != null
                              ? `${formatRevenue(client.currentMonth.effectiveHourlyRate)}/hr`
                              : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-white">
                            {client.contractType === 'Unlimited' ? formatRevenue(client.monthlyRevenue) : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-2xl ${statusColor}`}>{statusIcon}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setContractHealthExportClient(client);
                                setContractHealthExportLoading(true);
                                setContractHealthExportRange('3');
                                setContractHealthExportYear('');
                                const res = await fetch(`${API_URL}/api/contract-usage?clientId=${client.clientId}`);
                                if (!res.ok) throw new Error('Failed to fetch contract usage history');
                                const data = await res.json();
                                setContractHealthExportData(data);
                              } catch (err) {
                                console.error('Error preparing export data:', err);
                                alert('Failed to load contract usage data for export.');
                                setContractHealthExportClient(null);
                                setContractHealthExportData(null);
                              } finally {
                                setContractHealthExportLoading(false);
                              }
                            }}
                            className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                          >
                            ⬇ Export
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderContractHealthDetail = () => {
    const client = contractHealthDetailClient;
    const data = contractHealthDetailData;

    const monthsByYear = {};
    if (data?.months) {
      data.months.forEach((m) => {
        const year = m.month.split('-')[0];
        if (!monthsByYear[year]) monthsByYear[year] = [];
        monthsByYear[year].push(m);
      });
      Object.keys(monthsByYear).forEach((year) => {
        monthsByYear[year].sort((a, b) => (a.month < b.month ? 1 : -1));
      });
    }

    const exportYear = (year) => {
      if (!client || !monthsByYear[year]) return;
      const header = ['Month', 'AllocatedHours', 'UsedHours', 'RemainingHours', 'PercentageUsed', 'MonthlyRevenue', 'OverageAmount', 'DiscountAmount', 'EffectiveHourlyRate', 'BlockHourlyRate', 'TotalCost'];
      const rows = monthsByYear[year].map((m) => [
        m.month,
        m.allocated ?? '',
        m.used ?? '',
        m.remaining ?? '',
        m.percentage ?? '',
        m.monthlyRevenue ?? '',
        m.overageAmount ?? '',
        m.discountAmount ?? '',
        m.effectiveHourlyRate ?? '',
        m.blockHourlyRate ?? '',
        m.cost ?? '',
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = client.clientName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      link.href = url;
      link.setAttribute('download', `${safeName}_contract_usage_year_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div>
        <button
          onClick={() => {
            setActiveView('contract-health');
            setContractHealthDetailClient(null);
            setContractHealthDetailData(null);
          }}
          className="mb-4 min-h-[44px] inline-flex items-center px-3 py-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-gray-800 text-sm touch-manipulation"
        >
          ← Back to Contract Health
        </button>

        {contractHealthDetailLoading || !data ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading contract usage history...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 break-words">{data.clientName || data.client}</h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  {data.contractType === 'Block Hours'
                    ? `Block Hours — ${data.monthlyHours ?? 'N/A'} hrs / month`
                    : data.contractType === 'Unlimited'
                    ? 'Unlimited Support'
                    : 'No contract data'}
                </p>
                {data.currentMonth && (() => {
                  const cm = data.currentMonth;
                  if (data.contractType === 'Unlimited' && (cm.monthlyRevenue != null || cm.monthlyRevenue === 0)) {
                    return (
                      <p className="text-gray-300 text-sm mt-1">
                        Monthly Contract Amount: {formatRevenue(cm.monthlyRevenue)}
                      </p>
                    );
                  }
                  if (data.contractType === 'Block Hours') {
                    const discountAmount = cm.discountAmount != null ? Number(cm.discountAmount) : 0;
                    const blockRate = cm.blockHourlyRate != null ? Number(cm.blockHourlyRate) : null;
                    const effectiveRate = cm.effectiveHourlyRate != null ? Number(cm.effectiveHourlyRate) : null;
                    return (
                      <div className="text-gray-300 text-sm mt-1 space-y-0.5">
                        {blockRate != null && (
                          <p>Hourly Rate: {formatRevenue(blockRate)}/hr</p>
                        )}
                        {discountAmount > 0 && (
                          <>
                            <p>Discount: -{formatRevenue(discountAmount)}</p>
                            {effectiveRate != null && (
                              <p className="font-semibold">Effective Rate: {formatRevenue(effectiveRate)}/hr</p>
                            )}
                          </>
                        )}
                        {cm.overageAmount != null && Number(cm.overageAmount) > 0 && (
                          <p>Overage Amount: {formatRevenue(cm.overageAmount)}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {!data.months?.length ? (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                <p className="text-gray-400">No historical contract usage recorded for this client yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(monthsByYear)
                  .sort((a, b) => (a < b ? 1 : -1))
                  .map((year) => (
                    <div key={year} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                      <details open={year === new Date().getFullYear().toString()}>
                        <summary className="cursor-pointer select-none px-4 py-3 min-h-[44px] bg-gray-900 flex items-center justify-between gap-2 touch-manipulation">
                          <span className="text-lg font-semibold text-white">{year}</span>
                          <span className="text-gray-400 text-xs sm:text-sm shrink-0">Tap to expand/collapse</span>
                        </summary>
                        <div className="p-3 sm:p-4 overflow-x-auto">
                          {(() => {
                            const yearMonths = monthsByYear[year];
                            const pctValues =
                              data.contractType === 'Unlimited'
                                ? []
                                : yearMonths
                                    .map((m) => m.percentage)
                                    .filter((v) => v !== null && v !== undefined);
                            let avgPct = null;
                            if (pctValues.length > 0) {
                              avgPct = pctValues.reduce((sum, v) => sum + v, 0) / pctValues.length;
                            }
                            return avgPct !== null ? (
                              <div className="mb-3 flex items-center justify-between">
                                <div className="text-sm text-gray-300">
                                  <span className="font-semibold">Average % Used ({year}): </span>
                                  <span className="font-bold">{Math.round(avgPct)}%</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => exportYear(year)}
                                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                                >
                                  ⬇ Export {year}
                                </button>
                              </div>
                            ) : (
                              <div className="mb-3 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => exportYear(year)}
                                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                                >
                                  ⬇ Export {year}
                                </button>
                              </div>
                            );
                          })()}
                          <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <table className="w-full text-sm min-w-[320px]">
                              <thead>
                                <tr className="border-b border-gray-700">
                                  <th className="text-left py-2 px-2 text-gray-400 text-xs sm:text-sm">Month</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">Alloc.</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">Used</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">Remain</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">%</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">Monthly Rev.</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">Overage</th>
                                  <th className="text-right py-2 px-1 text-gray-400 text-xs sm:text-sm">Eff. Rate</th>
                                  <th className="text-right py-2 px-2 text-gray-400 text-xs sm:text-sm">Charges</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthsByYear[year].map((m) => {
                                  const [yr, monthNum] = m.month.split('-');
                                  const d = new Date(parseInt(yr, 10), parseInt(monthNum, 10) - 1);
                                  const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                  const pct = m.percentage ?? null;
                                  let pctClass = 'text-green-400';
                                  if (pct !== null) {
                                    if (pct >= 91) pctClass = 'text-red-400';
                                    else if (pct >= 71) pctClass = 'text-yellow-400';
                                  }
                                  return (
                                    <tr key={m.month} className="border-b border-gray-800">
                                      <td className="py-2 px-2 text-white text-xs sm:text-sm">{monthLabel}</td>
                                      <td className="py-2 px-1 text-right text-white text-xs sm:text-sm">
                                        {data.contractType === 'Unlimited' ? 'N/A' : m.allocated ?? '—'}
                                      </td>
                                      <td className="py-2 px-1 text-right text-white text-xs sm:text-sm">{m.used ?? 0}</td>
                                      <td className="py-2 px-1 text-right text-white text-xs sm:text-sm">
                                        {data.contractType === 'Unlimited' ? 'N/A' : m.remaining ?? '—'}
                                      </td>
                                      <td className={`py-2 px-1 text-right font-medium text-xs sm:text-sm ${pctClass}`}>
                                        {data.contractType === 'Unlimited' || pct === null ? 'N/A' : `${pct}%`}
                                      </td>
                                      <td className="py-2 px-1 text-right text-white text-xs sm:text-sm">
                                        {data.contractType === 'Unlimited' ? formatRevenue(m.monthlyRevenue) : '—'}
                                      </td>
                                      <td className="py-2 px-1 text-right text-white text-xs sm:text-sm">
                                        {data.contractType === 'Block Hours' && m.overageAmount != null && Number(m.overageAmount) > 0
                                          ? formatRevenue(m.overageAmount)
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-1 text-right text-white text-xs sm:text-sm">
                                        {data.contractType === 'Block Hours' && m.effectiveHourlyRate != null
                                          ? `${formatRevenue(m.effectiveHourlyRate)}/hr`
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-2 text-right text-white text-xs sm:text-sm">
                                        {formatRevenue(m.cost)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContractHealthExportModal = () => {
    const client = contractHealthExportClient;
    const data = contractHealthExportData;

    if (!client) return null;

    const months = data?.months || [];
    const sortedMonths = [...months].sort((a, b) => (a.month < b.month ? 1 : -1));
    const years = Array.from(
      new Set(months.map((m) => m.month.split('-')[0]))
    ).sort((a, b) => (a < b ? 1 : -1));

    const doExport = () => {
      if (!months.length) {
        alert('No contract usage history available for this client yet.');
        return;
      }

      let slice = [];

      if (contractHealthExportRange === '3') {
        slice = sortedMonths.slice(0, 3);
      } else if (contractHealthExportRange === '6') {
        slice = sortedMonths.slice(0, 6);
      } else if (contractHealthExportRange === 'year') {
        if (!contractHealthExportYear) {
          alert('Please select a year to export.');
          return;
        }
        slice = months.filter((m) => m.month.startsWith(contractHealthExportYear + '-'));
        if (!slice.length) {
          alert(`No data found for year ${contractHealthExportYear}.`);
          return;
        }
      }

      const header = ['Month', 'AllocatedHours', 'UsedHours', 'RemainingHours', 'PercentageUsed', 'TotalCost'];
      const rows = slice.map((m) => [
        m.month,
        m.allocated ?? '',
        m.used ?? '',
        m.remaining ?? '',
        m.percentage ?? '',
        m.cost ?? '',
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = client.clientName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const label =
        contractHealthExportRange === '3'
          ? 'last_90_days'
          : contractHealthExportRange === '6'
          ? 'last_6_months'
          : `year_${contractHealthExportYear}`;
      link.href = url;
      link.setAttribute('download', `${safeName}_contract_usage_${label}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto" onClick={() => setContractHealthExportClient(null)}>
        <div
          className="bg-gray-800 rounded-t-2xl sm:rounded-lg p-4 sm:p-6 max-w-md w-full border border-gray-700 border-b-0 sm:border-b max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Export Contract Usage</h3>
            <button
              onClick={() => setContractHealthExportClient(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white text-xl touch-manipulation -mr-2"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-300 mb-4 break-words">
            {client.clientName}
          </p>
          {contractHealthExportLoading ? (
            <div className="text-gray-400 text-sm">Loading data...</div>
          ) : !months.length ? (
            <div className="text-gray-400 text-sm">No contract usage history available for this client yet.</div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                <div className="text-sm text-gray-300 font-medium">Export Range</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-200">
                    <input
                      type="radio"
                      name="contract-export-range"
                      value="3"
                      checked={contractHealthExportRange === '3'}
                      onChange={(e) => setContractHealthExportRange(e.target.value)}
                    />
                    Last 90 days (3 months)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-200">
                    <input
                      type="radio"
                      name="contract-export-range"
                      value="6"
                      checked={contractHealthExportRange === '6'}
                      onChange={(e) => setContractHealthExportRange(e.target.value)}
                    />
                    Last 6 months
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-200">
                    <input
                      type="radio"
                      name="contract-export-range"
                      value="year"
                      checked={contractHealthExportRange === 'year'}
                      onChange={(e) => setContractHealthExportRange(e.target.value)}
                    />
                    Specific year
                  </label>
                </div>
                {contractHealthExportRange === 'year' && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-1">Select Year</label>
                    <select
                      value={contractHealthExportYear}
                      onChange={(e) => setContractHealthExportYear(e.target.value)}
                      className="w-full min-h-[44px] bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm touch-manipulation"
                    >
                      <option value="">Choose year…</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                <button
                  onClick={() => setContractHealthExportClient(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={doExport}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white touch-manipulation"
                >
                  Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSurveys = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Survey Templates</h2>
        <p className="text-gray-400 text-sm sm:text-base">Manage your survey templates and questions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {surveyTemplates.map(template => (
          <div key={template.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{template.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                template.active ? 'bg-green-600' : 'bg-gray-600'
              }`}>
                {template.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-400">
                📝 {JSON.parse(template.questions || '[]').length} questions
              </p>
              <p className="text-sm text-gray-400">
                📊 Type: {template.type}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setEditingTemplate(template)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Edit
              </button>
              <button 
                onClick={() => setPreviewingTemplate(template)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 border-b border-blue-600 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="bg-white rounded-lg p-2">
              <div className="text-blue-900 font-bold text-lg sm:text-xl">NW</div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Northwind Survey System</h1>
              <p className="text-xs sm:text-sm text-blue-200">Client Feedback & Satisfaction Monitoring</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-blue-200">Boise, Idaho</p>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-b border-gray-700 px-2 sm:px-6">
        <div className="flex gap-0.5 sm:gap-1 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'dashboard' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('clients')}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'clients' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveView('responses')}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'responses' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Survey Responses
          </button>
          <button
            onClick={() => setActiveView('pending')}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'pending' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pending Surveys
          </button>
          <button
            onClick={() => setActiveView('archives')}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'archives' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Archives
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveView('audit-logs')}
              className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
                activeView === 'audit-logs' 
                  ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Audit Log
            </button>
          )}
          <button
            onClick={() => {
              setActiveView('contract-health');
              setContractHealthDetailClient(null);
              setContractHealthDetailData(null);
            }}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'contract-health' || activeView === 'contract-health-detail'
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Contract Health
          </button>
          <button
            onClick={() => setActiveView('surveys')}
            className={`min-h-[44px] px-3 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap touch-manipulation shrink-0 ${
              activeView === 'surveys' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Survey Templates
          </button>
        </div>
      </nav>

      <main className="p-3 sm:p-6">
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'clients' && renderClients()}
        {activeView === 'responses' && renderResponses()}
        {activeView === 'pending' && renderPendingSurveys()}
        {activeView === 'archives' && renderArchives()}
        {activeView === 'audit-logs' && renderAuditLog()}
        {activeView === 'contract-health' && renderContractHealth()}
        {activeView === 'contract-health-detail' && renderContractHealthDetail()}
        {activeView === 'surveys' && renderSurveys()}
      </main>

      {/* Contact Selection Modal */}
      {selectingContactFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectingContactFor(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Select Primary Contact</h2>
                <p className="text-gray-400 text-sm mt-1">{selectingContactFor.name}</p>
              </div>
              <button 
                onClick={() => setSelectingContactFor(null)} 
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>
            
            {clientContacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No contacts found for this company in Autotask.</p>
                <p className="text-sm text-gray-500">Contacts need to be added in Autotask first, then re-sync.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientContacts.map(contact => (
                  <div 
                    key={contact.autotask_id}
                    className={`bg-gray-700 rounded-lg p-4 border border-gray-600 transition-colors ${isAdmin ? 'hover:border-blue-500 cursor-pointer' : 'cursor-default'}`}
                    onClick={() => {
                      if (!isAdmin) return;
                      if (contact.email) {
                        if (confirm(`Set ${contact.first_name} ${contact.last_name} as primary contact for surveys?`)) {
                          setPrimaryContact(selectingContactFor.id || selectingContactFor.autotask_id, contact.autotask_id);
                        }
                      } else {
                        alert('❌ This contact has no email address in Autotask');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {contact.is_primary === 1 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600">
                              Primary in Autotask
                            </span>
                          )}
                          {contact.email === selectingContactFor.email && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-600">
                              ✓ Currently Selected
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {contact.title && (
                            <p className="text-sm text-gray-400">{contact.title}</p>
                          )}
                          {contact.email ? (
                            <p className="text-sm text-blue-400">📧 {contact.email}</p>
                          ) : (
                            <p className="text-sm text-red-400">📧 No email address</p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-gray-400">📞 {contact.phone}</p>
                          )}
                        </div>
                      </div>
                      
                      {contact.email && isAdmin && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Set ${contact.first_name} ${contact.last_name} as primary contact?`)) {
                              setPrimaryContact(selectingContactFor.id || selectingContactFor.autotask_id, contact.autotask_id);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                ℹ️ Select the contact who should receive survey emails for this company. Only contacts with email addresses can be selected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClient(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
              <button 
                onClick={() => setSelectedClient(null)} 
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Contact Person</p>
                  <p className="text-white font-medium">{selectedClient.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">{selectedClient.email || 'No email on file'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white font-medium capitalize">{selectedClient.company_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Average Score</p>
                  <p className="text-white font-medium text-2xl">{selectedClient.score || 'N/A'}</p>
                </div>
              </div>

              {/* Survey Schedule Section */}
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-bold text-white mb-3">Survey Schedule</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Last Survey Sent</p>
                    <p className="text-white font-medium">
                      {selectedClient.last_survey 
                        ? new Date(selectedClient.last_survey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Next Survey Scheduled</p>
                    <p className={`font-medium ${selectedClient.next_survey ? 'text-blue-400' : 'text-gray-500'}`}>
                      {selectedClient.next_survey 
                        ? new Date(selectedClient.next_survey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                {selectedClient.survey_frequency && (
                  <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-200">
                      ⏱️ Current frequency: Every <strong>{selectedClient.survey_frequency} days</strong>
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-sm text-gray-400 mb-2">Set survey frequency:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90].map(days => (
                      <button
                        key={days}
                        onClick={async () => {
                          try {
                            const response = await fetch(`${API_URL}/api/clients/${selectedClient.id || selectedClient.autotask_id}/schedule-survey`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ days, userEmail, userName })
                            });
                            
                            if (response.status === 403) {
                              alert('❌ Admin access required');
                              return;
                            }
                            
                            const result = await response.json();
                            if (result.success) {
                              // Update the selected client with new data
                              setSelectedClient({
                                ...selectedClient,
                                survey_frequency: days,
                                next_survey: result.next_survey
                              });
                              // Refresh client list in background
                              fetchClients();
                            }
                          } catch (error) {
                            alert('❌ Failed to schedule survey');
                          }
                        }}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          selectedClient.survey_frequency === days 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {days} days
                      </button>
                    ))}
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`${API_URL}/api/clients/${selectedClient.id || selectedClient.autotask_id}/schedule-survey`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ days: null, userEmail, userName })
                          });
                          
                          if (response.status === 403) {
                            alert('❌ Admin access required');
                            return;
                          }
                          
                          const result = await response.json();
                          if (result.success) {
                            setSelectedClient({
                              ...selectedClient,
                              survey_frequency: null,
                              next_survey: null
                            });
                            fetchClients();
                          }
                        } catch (error) {
                          alert('❌ Failed to clear schedule');
                        }
                      }}
                      className={`px-3 py-2 rounded text-sm font-medium ${
                        !selectedClient.survey_frequency 
                          ? 'bg-gray-600 text-white ring-2 ring-gray-400' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      Never
                    </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {/* Survey Template Selector */}
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-2">Survey Template</label>
                  <select
                    value={selectedSurveyType}
                    onChange={(e) => setSelectedSurveyType(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {surveyTemplates.map(template => (
                      <option key={template.id} value={template.type}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={async () => {
                    if (!selectedClient.email) {
                      alert('❌ This client has no email address. Please select a contact first.');
                      return;
                    }
                    
                    if (confirm(`Send ${selectedSurveyType} survey to ${selectedClient.email}?`)) {
                      try {
                        const response = await fetch(`${API_URL}/api/surveys/send/${selectedClient.id || selectedClient.autotask_id}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ surveyType: selectedSurveyType })
                        });
                        const result = await response.json();
                        
                        if (result.success) {
                          alert(`✅ Survey sent to ${selectedClient.email}!`);
                          setSelectedClient(null);
                          fetchClients();
                        } else {
                          alert(`❌ Error: ${result.error}`);
                        }
                      } catch (error) {
                        alert('❌ Failed to send survey');
                      }
                    }
                  }}
                  disabled={!selectedClient.email}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedClient.email 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  📤 Send Survey Now
                </button>
                {isAdmin && (
                  <button 
                    onClick={async () => {
                      setSelectingContactFor(selectedClient);
                      setSelectedClient(null);
                      await fetchClientContacts(selectedClient.id || selectedClient.autotask_id);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    👥 Select Contact
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Health Export Modal */}
      {renderContractHealthExportModal()}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setEditingTemplate(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Template: {editingTemplate.name}</h2>
              <button onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Template Name</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={editingTemplate.type}
                  onChange={(e) => setEditingTemplate({...editingTemplate, type: e.target.value})}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Quarterly">Quarterly</option>
                  <option value="Post-Ticket">Post-Ticket</option>
                  <option value="Post-Project">Post-Project</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">Questions</label>
                  <button
                    onClick={() => {
                      const questions = JSON.parse(editingTemplate.questions || '[]');
                      questions.push({ text: 'New question', type: 'rating' });
                      setEditingTemplate({...editingTemplate, questions: JSON.stringify(questions)});
                    }}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium"
                  >
                    + Add Question
                  </button>
                </div>

                <div className="space-y-3">
                  {JSON.parse(editingTemplate.questions || '[]').map((q, idx) => (
                    <div key={idx} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) => {
                              const questions = JSON.parse(editingTemplate.questions);
                              questions[idx].text = e.target.value;
                              setEditingTemplate({...editingTemplate, questions: JSON.stringify(questions)});
                            }}
                            className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                            placeholder="Question text"
                          />
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const questions = JSON.parse(editingTemplate.questions);
                              questions[idx].type = e.target.value;
                              setEditingTemplate({...editingTemplate, questions: JSON.stringify(questions)});
                            }}
                            className="bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="rating">Rating (1-10)</option>
                            <option value="text">Text Response</option>
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const questions = JSON.parse(editingTemplate.questions);
                            questions.splice(idx, 1);
                            setEditingTemplate({...editingTemplate, questions: JSON.stringify(questions)});
                          }}
                          className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={editingTemplate.active}
                  onChange={(e) => setEditingTemplate({...editingTemplate, active: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-gray-300">Active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => saveTemplate(editingTemplate)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Template Modal */}
      {previewingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setPreviewingTemplate(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Preview: {previewingTemplate.name}</h2>
              <button onClick={() => setPreviewingTemplate(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <div className="space-y-4">
              {JSON.parse(previewingTemplate.questions || '[]').map((q, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-4">
                  <p className="text-white font-medium mb-3">{idx + 1}. {q.text}</p>
                  {q.type === 'rating' ? (
                    <div>
                      <div className="flex gap-2 justify-center mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <div key={num} className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {num}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 px-1">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500"
                      rows="3"
                      placeholder="Text response..."
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setPreviewingTemplate(null)}
              className="w-full mt-6 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg font-medium"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;