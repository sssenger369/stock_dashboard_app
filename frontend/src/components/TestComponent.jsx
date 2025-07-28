// Test component to isolate issues
import React from 'react';

function TestComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Test Component</h1>
        <p className="text-slate-400">If you can see this, React is working correctly!</p>
        <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
          <p className="text-white">This is a minimal test to check if the issue is in the main component.</p>
        </div>
      </div>
    </div>
  );
}

export default TestComponent;