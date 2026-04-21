import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Goal {
  id: string;
  subject: string;
  domain: string;
  sentence: string;
  description: string;
}

export default function GoalBrowser() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch('/api/goals')
      .then(res => res.json())
      .then(data => {
        // Option to filter by subject query param if it exists
        const params = new URLSearchParams(location.search);
        const subjectParam = params.get('subject');
        
        if (subjectParam) {
          setGoals(data.filter((g: Goal) => g.subject === subjectParam));
        } else {
          setGoals(data);
        }
      });
  }, [location]);

  // Group goals by subject for UI
  const groupedGoals = goals.reduce((acc, goal) => {
    if (!acc[goal.subject]) acc[goal.subject] = [];
    acc[goal.subject].push(goal);
    return acc;
  }, {} as Record<string, Goal[]>);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Kerndoelen</h1>
        <p className="text-zinc-500 mt-1">Blader door de genormaliseerde SLO kerndoelen per vak.</p>
      </div>

      <div className="space-y-12">
        {Object.entries(groupedGoals).map(([subject, subjectGoals]) => {
          const goalsList = subjectGoals as Goal[];
          return (
          <div key={subject} className="space-y-4">
            <h2 className="text-xl font-medium text-zinc-900 border-b border-zinc-200 pb-2">
              {subject}
            </h2>
            
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y divide-zinc-200">
                {goalsList.map((goal) => (
                  <div 
                    key={goal.id} 
                    onClick={() => navigate(`/teacher/goals/${goal.id}`)}
                    className="p-4 flex gap-4 items-start hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <div className="w-16 flex-shrink-0 pt-0.5">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-mono font-medium">
                        {goal.id}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-blue-600 mb-1">{goal.domain}</div>
                      <div className="font-semibold text-zinc-900 mb-1">
                        {/* Capitalize first letter strictly for cleaner UI */}
                        {goal.sentence.charAt(0).toUpperCase() + goal.sentence.slice(1)}
                      </div>
                      <div className="text-sm text-zinc-500 line-clamp-2">
                        {goal.description}
                      </div>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )})}
        {goals.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Laden...
          </div>
        )}
      </div>
    </div>
  );
}
