import { useState, useEffect } from 'react';
import type { SportsTeam } from '../types';

interface FanPollWidgetProps {
  matchId: string;
  tournament: string;
  teamA: SportsTeam;
  teamB: SportsTeam;
}

export function FanPollWidget({ matchId, tournament, teamA, teamB }: FanPollWidgetProps) {
  const storageKey = `kg_fan_poll_${matchId}`;

  const [votes, setVotes] = useState<{ a: number; b: number; userVote?: 'A' | 'B' }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    // Seeded initial engagement count based on matchId hash
    const seed = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return { a: (seed % 40) + 30, b: (seed % 35) + 25 };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(votes));
    } catch {
      // ignore
    }
  }, [votes, storageKey]);

  const total = votes.a + votes.b;
  const pctA = Math.round((votes.a / total) * 100);
  const pctB = 100 - pctA;

  const handleVote = (choice: 'A' | 'B') => {
    if (votes.userVote) return;
    setVotes((prev) => ({
      a: choice === 'A' ? prev.a + 1 : prev.a,
      b: choice === 'B' ? prev.b + 1 : prev.b,
      userVote: choice,
    }));
  };

  return (
    <div className="fan-poll-box">
      <div className="fan-poll-header">
        <div className="fan-poll-title">
          <span className="poll-badge">FAN PREDICTION</span>
          <h4>Who will win this match?</h4>
        </div>
        <span className="poll-total-votes">{total.toLocaleString()} fan votes</span>
      </div>

      <div className="fan-poll-options">
        <button
          type="button"
          onClick={() => handleVote('A')}
          disabled={Boolean(votes.userVote)}
          className={`fan-poll-btn ${votes.userVote === 'A' ? 'is-voted' : ''}`}
        >
          <span className="poll-team-name">{teamA.name}</span>
          <span className="poll-pct">{pctA}%</span>
        </button>

        <button
          type="button"
          onClick={() => handleVote('B')}
          disabled={Boolean(votes.userVote)}
          className={`fan-poll-btn ${votes.userVote === 'B' ? 'is-voted' : ''}`}
        >
          <span className="poll-team-name">{teamB.name}</span>
          <span className="poll-pct">{pctB}%</span>
        </button>
      </div>

      <div className="poll-bar-track">
        <div className="poll-bar-fill-a" style={{ width: `${pctA}%` }} />
        <div className="poll-bar-fill-b" style={{ width: `${pctB}%` }} />
      </div>

      <p className="poll-caption">
        {votes.userVote
          ? `You voted for ${votes.userVote === 'A' ? teamA.name : teamB.name}. Prediction logged!`
          : `Vote now to lock in your matchday prediction for ${tournament}.`}
      </p>
    </div>
  );
}
