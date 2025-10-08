export default function CoinFlipAnimation({ status, teamA, teamB, winner }) {
  const showFront = winner ? winner.id === teamA?.id : true
  const coinClassNames = [
    'coin-flip-coin',
    status === 'flipping'
      ? 'coin-flip-coin--spinning'
      : showFront
      ? 'coin-flip-coin--front'
      : 'coin-flip-coin--back',
  ].join(' ')

  return (
    <div className="coin-flip-wrapper">
      <div className={coinClassNames}>
        <div className="coin-flip-face coin-flip-face--front">
          <span className="coin-flip-label">Heads</span>
          <span className="coin-flip-team">{teamA?.name ?? 'Team A'}</span>
        </div>
        <div className="coin-flip-face coin-flip-face--back">
          <span className="coin-flip-label">Tails</span>
          <span className="coin-flip-team">{teamB?.name ?? 'Team B'}</span>
        </div>
      </div>
    </div>
  )
}