import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function SurveyResponse() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [surveyData, setSurveyData] = useState(null);
  
  const [responses, setResponses] = useState({
    overall_satisfaction: 0,
    response_time: 0,
    technical_knowledge: 0,
    communication: 0,
    recommend_score: 0,
    what_we_do_well: '',
    what_to_improve: '',
    additional_comments: ''
  });

  useEffect(() => {
    fetchSurveyData();
  }, [token]);

  const fetchSurveyData = async () => {
    try {
      const response = await fetch(`https://northwind-survey-backend.onrender.com/api/survey/${token}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSurveyData(data);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load survey');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all ratings are filled
    if (responses.overall_satisfaction === 0 || 
        responses.response_time === 0 || 
        responses.technical_knowledge === 0 ||
        responses.communication === 0 ||
        responses.recommend_score === 0) {
      alert('Please rate all questions before submitting');
      return;
    }
    
    try {
      const response = await fetch(`https://northwind-survey-backend.onrender.com/api/survey/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responses)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSubmitted(true);
      } else {
        alert('Error submitting survey: ' + result.error);
      }
    } catch (err) {
      alert('Failed to submit survey');
    }
  };

  const RatingQuestion = ({ question, field }) => (
    <div className="mb-8">
      <label className="block text-lg font-medium text-gray-800 mb-4">
        {question}
      </label>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => setResponses({ ...responses, [field]: num })}
            className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
              responses[field] === num
                ? 'bg-blue-600 text-white scale-110 shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-gray-500 mt-2 px-2">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading survey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Survey Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Thank You!</h2>
          <p className="text-lg text-gray-600 mb-2">
            Your feedback has been submitted successfully.
          </p>
          <p className="text-gray-500">
            We appreciate you taking the time to help us improve our service.
          </p>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-400">
              You can now close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-600 text-white rounded-lg p-3 text-2xl font-bold">
              NW
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Northwind MSP Survey
              </h1>
              <p className="text-gray-600">Quarterly Client Satisfaction Survey</p>
            </div>
          </div>
          
          {surveyData && (
            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700">
                <strong>Company:</strong> {surveyData.client.name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Contact:</strong> {surveyData.client.contact_person}
              </p>
            </div>
          )}
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              How are we doing?
            </h2>
            <p className="text-gray-600">
              Please rate your experience with our IT support services on a scale of 1-10.
            </p>
          </div>

          <RatingQuestion 
            question="1. How satisfied are you with our overall service?"
            field="overall_satisfaction"
          />

          <RatingQuestion 
            question="2. How would you rate our response time to your requests?"
            field="response_time"
          />

          <RatingQuestion 
            question="3. How knowledgeable is our technical team?"
            field="technical_knowledge"
          />

          <RatingQuestion 
            question="4. How effective is our communication?"
            field="communication"
          />

          <RatingQuestion 
            question="5. How likely are you to recommend Northwind to others?"
            field="recommend_score"
          />

          {/* Open-ended questions */}
          <div className="space-y-6 mt-8 pt-8 border-t border-gray-200">
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                6. What do we do well?
              </label>
              <textarea
                value={responses.what_we_do_well}
                onChange={(e) => setResponses({ ...responses, what_we_do_well: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Tell us what you appreciate about our service..."
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                7. What could we improve?
              </label>
              <textarea
                value={responses.what_to_improve}
                onChange={(e) => setResponses({ ...responses, what_to_improve: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Help us get better by sharing areas for improvement..."
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                8. Any additional comments?
              </label>
              <textarea
                value={responses.additional_comments}
                onChange={(e) => setResponses({ ...responses, additional_comments: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Anything else you'd like us to know..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors shadow-lg"
          >
            Submit Survey
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Your responses are confidential and help us improve our service.
          </p>
        </form>
      </div>
    </div>
  );
}

export default SurveyResponse;