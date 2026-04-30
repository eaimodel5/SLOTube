import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';

interface Goal {
  id: string;
  subject: string;
  domain: string;
  sentence: string;
  description: string;
}

import { isTextSimilar } from '../../lib/textUtils';

export default function GoalBrowser() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Group goals by subject for UI, applying local search filter
  const filteredGoals = goals.filter(goal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      goal.sentence.toLowerCase().includes(query) ||
      goal.subject.toLowerCase().includes(query) ||
      goal.id.toLowerCase().includes(query) ||
      goal.description.toLowerCase().includes(query)
    );
  });

  const groupedGoals = filteredGoals.reduce((acc, goal) => {
    if (!acc[goal.subject]) acc[goal.subject] = [];
    acc[goal.subject].push(goal);
    return acc;
  }, {} as Record<string, Goal[]>);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Officiële Kerndoelen</h1>
        <p className="text-zinc-500 mt-1">Blader door de SLO-kerndoelen gebaseerd op het curriculum en ontdek lesmateriaal.</p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400" />
        </div>
        <input
          type="text"
          autoFocus
          className="block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-xl leading-5 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 sm:text-sm transition-colors"
          placeholder="Typ om direct te zoeken in kerndoelen, vakken of codes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
                        {goal.sentence.charAt(0).toUpperCase() + goal.sentence.slice(1)}
                      </div>
                      {!isTextSimilar(goal.sentence, goal.description) && (
                        <div className="text-sm text-zinc-500 line-clamp-2">
                          {goal.description}
                        </div>
                      )}
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
        {goals.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Laden...
          </div>
        ) : Object.keys(groupedGoals).length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            Geen kerndoelen gevonden voor "{searchQuery}"
          </div>
        ) : null}
      </div>
    </div>
  );
}
