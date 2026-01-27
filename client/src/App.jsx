import { useState, useEffect } from 'react';
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
  const RESPONSES_PER_PAGE = 10;

  useEffect(() => {
    fetchClients();
    fetchStats();
    fetchSurveyStatistics();
    fetchTemplates();
  }, []);

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

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/clients');
      const data = await response.json();
      setClients(data);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/stats/by-type');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSurveyStatistics = async () => {
    try {
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/surveys/statistics');
      const data = await response.json();
      setSurveyStats(data.stats);
      setRecentResponses(data.recent_responses);
    } catch (err) {
      console.error('Error fetching survey statistics:', err);
    }
  };

  const fetchAllResponses = async () => {
    try {
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/surveys/responses');
      const data = await response.json();
      setAllResponses(data);
    } catch (err) {
      console.error('Error fetching all responses:', err);
    }
  };

  const fetchPendingSurveys = async () => {
    try {
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/surveys/pending');
      const data = await response.json();
      setPendingSurveys(data.surveys || []);
    } catch (err) {
      console.error('Error fetching pending surveys:', err);
      setPendingSurveys([]);
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
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/survey-templates');
      const data = await response.json();
      setSurveyTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const saveTemplate = async (template) => {
    try {
      const url = template.id 
        ? `https://northwind-survey-backend.onrender.com/api/survey-templates/${template.id}`
        : 'https://northwind-survey-backend.onrender.com/api/survey-templates';
      
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
      const response = await fetch(`https://northwind-survey-backend.onrender.com/api/clients/${clientId}/contacts`);
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
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/sync/companies', {
        method: 'POST'
      });
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
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/sync/contacts', {
        method: 'POST'
      });
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

  const deleteAllSurveyData = async () => {
    const confirmMessage = '⚠️ WARNING: This will permanently delete ALL survey responses, reset all client scores to 0, and clear last_survey dates.\n\nThis action cannot be undone!\n\nAre you absolutely sure you want to proceed?';
    
    if (!confirm(confirmMessage)) return;
    
    // Double confirmation
    if (!confirm('⚠️ FINAL WARNING: This will delete ALL survey data. Click OK to proceed or Cancel to abort.')) return;
    
    try {
      setSyncing(true);
      const response = await fetch('https://northwind-survey-backend.onrender.com/api/admin/delete-all-surveys', {
        method: 'POST'
      });
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

  const setPrimaryContact = async (clientId, contactId) => {
    try {
      const response = await fetch(`https://northwind-survey-backend.onrender.com/api/clients/${clientId}/set-primary-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      });
      
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
    if (!score || score === 0) return 'Pending';
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    return 'Needs Attention';
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Admin Actions */}
      <div className="lg:col-span-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-red-300 mb-1">⚠️ Admin Actions</h3>
            <p className="text-sm text-red-200">Dangerous operations - use with caution</p>
          </div>
          <button
            onClick={deleteAllSurveyData}
            disabled={syncing}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors text-white"
          >
            {syncing ? '⏳ Deleting...' : '🗑️ Delete All Survey Data'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Pending Surveys</span>
            <span className="text-3xl">📧</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-white">{surveyStats?.pending || 0}</div>
            <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">View →</span>
          </div>
          <div className="text-sm text-yellow-400 mt-1">Awaiting response</div>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Client Management</h2>
            <p className="text-gray-400">Showing {filteredClients.length} of {clients.length} clients</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={syncCompanies}
              disabled={syncing}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? '⏳ Syncing...' : '🔄 Sync Companies'}
            </button>
            <button 
              onClick={syncContacts}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? '⏳ Syncing...' : '👥 Sync Contacts'}
            </button>
            <button 
              onClick={fetchClients}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
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
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              clientFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Clients ({clients.length})
          </button>
          
          <button
            onClick={() => setClientFilter('managed')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              clientFilter === 'managed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🎯 Managed ({managedCount})
          </button>
          
          <button
            onClick={() => setClientFilter('break-fix')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              clientFilter === 'break-fix'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🔧 Break-Fix ({breakFixCount})
          </button>
        </div>

        {clientFilter === 'managed' && (
          <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-200 text-sm">
              📧 These {managedCount} managed clients will receive quarterly surveys
            </p>
          </div>
        )}

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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-white">{client.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(client.score)}`}>
                        {getStatusText(client.score)}
                      </span>
                      {client.company_type === 'managed' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600">
                          🎯 Managed
                        </span>
                      )}
                      {client.send_surveys === 1 && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600">
                          📧 Surveys Enabled
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

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={async () => {
                          setSelectingContactFor(client);
                          await fetchClientContacts(client.id || client.autotask_id);
                        }}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        👥 Select Contact
                      </button>
                    </div>
                  </div>
                  
                  {client.score > 0 && (
                    <div className="text-right ml-4">
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Survey Responses</h2>
            <p className="text-gray-400">
              Showing {startIdx + 1}-{Math.min(startIdx + RESPONSES_PER_PAGE, filteredResponses.length)} of {filteredResponses.length}
            </p>
          </div>
          <button 
            onClick={fetchAllResponses}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setResponsesFilter('all'); setResponsesPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              responsesFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All ({allResponses.length})
          </button>
          <button
            onClick={() => { setResponsesFilter('good'); setResponsesPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              responsesFilter === 'good'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ✓ Good (7+) ({allResponses.filter(r => r.avg_score >= 7).length})
          </button>
          <button
            onClick={() => { setResponsesFilter('needs-attention'); setResponsesPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
                      className="p-6 cursor-pointer"
                      onClick={() => toggleResponse(response.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-gray-400">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <h3 className="text-xl font-bold text-white">{response.client_name}</h3>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600">
                              {response.survey_type}
                            </span>
                            <span className={`text-2xl ${response.avg_score >= 7 ? 'text-green-500' : 'text-red-500'}`}>
                              {response.avg_score >= 7 ? '✓' : '⚠'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 ml-8">
                            Completed: {new Date(response.completed_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-400">
                            {Math.round(response.avg_score * 10) / 10}/10
                          </div>
                          <div className="text-xs text-gray-400">Average Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Accordion Content - Expandable */}
                    {isExpanded && (
                      <div className="px-6 pb-6">
                        {/* Rating Scores */}
                        <div className="grid grid-cols-5 gap-3 mb-4 pb-4 border-b border-gray-700">
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setResponsesPage(p => Math.max(1, p - 1))}
                  disabled={responsesPage === 1}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-gray-400">
                  Page {responsesPage} of {totalPages}
                </span>
                <button
                  onClick={() => setResponsesPage(p => Math.min(totalPages, p + 1))}
                  disabled={responsesPage === totalPages}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        const response = await fetch(`https://northwind-survey-backend.onrender.com/api/surveys/${surveyId}/resend`, {
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Pending Surveys</h2>
            <p className="text-gray-400">
              Surveys that have been sent but not yet completed ({pendingSurveys.length} total)
            </p>
          </div>
          <button 
            onClick={fetchPendingSurveys}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
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
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
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
        )}
      </div>
    );
  };

  const renderSurveys = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Survey Templates</h2>
        <p className="text-gray-400">Manage your survey templates and questions</p>
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
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 border-b border-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg p-2">
              <div className="text-blue-900 font-bold text-xl">NW</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Northwind Survey System</h1>
              <p className="text-sm text-blue-200">Client Feedback & Satisfaction Monitoring</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-blue-200">Boise, Idaho</p>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-b border-gray-700 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'dashboard' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('clients')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'clients' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveView('responses')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'responses' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Survey Responses
          </button>
          <button
            onClick={() => setActiveView('pending')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'pending' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pending Surveys
          </button>
          <button
            onClick={() => setActiveView('surveys')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'surveys' 
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Survey Templates
          </button>
        </div>
      </nav>

      <main className="p-6">
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'clients' && renderClients()}
        {activeView === 'responses' && renderResponses()}
        {activeView === 'pending' && renderPendingSurveys()}
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
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => {
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
                      
                      {contact.email && (
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

                <div className="border-t border-gray-600 pt-3">
                  <p className="text-sm text-gray-400 mb-2">Set survey frequency:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90].map(days => (
                      <button
                        key={days}
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://northwind-survey-backend.onrender.com/api/clients/${selectedClient.id || selectedClient.autotask_id}/schedule-survey`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ days })
                            });
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
                          const response = await fetch(`https://northwind-survey-backend.onrender.com/api/clients/${selectedClient.id || selectedClient.autotask_id}/schedule-survey`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ days: null })
                          });
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
                        const response = await fetch(`https://northwind-survey-backend.onrender.com/api/surveys/send/${selectedClient.id || selectedClient.autotask_id}`, {
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
              </div>
            </div>
          </div>
        </div>
      )}

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