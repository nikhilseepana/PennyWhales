import React from 'react';
import { theme } from '../theme';

interface IndianStockCardProps {
  symbol: string;
  addedAt?: string | null;
  isNew?: boolean;
  onDelete: (symbol: string) => void;
  chartUrl: string;
}

const IndianStockCard: React.FC<IndianStockCardProps> = ({
  symbol,
  addedAt,
  isNew = false,
  onDelete,
  chartUrl,
}) => {
  const formattedAddedAt = addedAt
    ? new Date(addedAt).toLocaleString()
    : 'Unknown';

  return (
    <div
      style={{
        border: `1px solid ${isNew ? theme.status.warning : theme.ui.border}`,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.ui.surface,
        padding: theme.spacing.md,
        boxShadow: theme.ui.shadow.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <div>
          <div
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.ui.text.primary,
              letterSpacing: 0.3,
            }}
          >
            {symbol}
          </div>
          <div
            style={{
              marginTop: theme.spacing.xs,
              fontSize: theme.typography.fontSize.sm,
              color: theme.ui.text.secondary,
            }}
          >
            NSE:{symbol}
          </div>
        </div>

        {isNew && (
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.status.warning,
              backgroundColor: '#fff8e1',
              border: '1px solid #ffe08a',
              borderRadius: theme.borderRadius.full,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              whiteSpace: 'nowrap',
            }}
          >
            NEW
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.ui.text.secondary,
        }}
      >
        Added on: {formattedAddedAt}
      </div>

      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
          marginTop: theme.spacing.xs,
        }}
      >
        <a
          href={chartUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            border: 'none',
            backgroundColor: theme.status.info,
            color: 'white',
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            textDecoration: 'none',
          }}
        >
          Open Chart
        </a>

        <button
          type="button"
          onClick={() => onDelete(symbol)}
          style={{
            border: 'none',
            backgroundColor: theme.status.danger,
            color: 'white',
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default IndianStockCard;
