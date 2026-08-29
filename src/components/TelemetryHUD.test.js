import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TelemetryHUD from './TelemetryHUD';

// Mock system telemetry only
jest.mock('../utils/systemTelemetry', () => ({
  fetchSystemTelemetry: jest.fn().mockResolvedValue({
    success: true,
    cpu: { usagePercent: 25, cores: 8, model: 'Test CPU' },
    ram: { totalGB: 16, usedGB: 8, freeGB: 8, usagePercent: 50 },
    gpu: { name: 'NVIDIA RTX 4070', usagePercent: 40, vramUsedGB: 6.2, vramTotalGB: 12.0, vramPercent: 52, tempC: 55 },
    models: [
      { id: 'precog-31b', name: 'Precog-Magnum 31B', engine: 'LLM', status: 'loaded', tokensGenerated: 1200, tokPerSec: 35.0 }
    ],
    tokens: { totalTokens: 1200, avgTokPerSec: 35.0 }
  })
}));

describe('TelemetryHUD Component Tests', () => {
  test('WHEN user is not logged in THEN nothing is rendered', () => {
    const { container } = render(<TelemetryHUD currentUser={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('WHEN user has role "user" or "guest" THEN nothing is rendered', () => {
    const { container: c1 } = render(<TelemetryHUD currentUser={{ role: 'user' }} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<TelemetryHUD currentUser={{ role: 'guest' }} />);
    expect(c2.firstChild).toBeNull();
  });

  test('WHEN user has role "admin" or "it" THEN the floating badge is rendered', () => {
    render(<TelemetryHUD currentUser={{ role: 'admin', username: 'Azgael' }} />);
    const badge = screen.getByTestId('telemetry-hud-badge');
    expect(badge).toBeInTheDocument();
  });

  test('WHEN clicking the badge THEN dropdown expands and stops event propagation', () => {
    render(<TelemetryHUD currentUser={{ role: 'it', username: 'TechAdmin' }} />);
    const badge = screen.getByTestId('telemetry-hud-badge');

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

    fireEvent(badge, clickEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
    const dropdown = screen.getByTestId('telemetry-hud-dropdown');
    expect(dropdown).toBeInTheDocument();
  });

  test('WHEN clicking "Abrir Consola de Logs" THEN logs modal is opened', () => {
    render(<TelemetryHUD currentUser={{ role: 'admin', username: 'Azgael' }} />);
    const badge = screen.getByTestId('telemetry-hud-badge');
    fireEvent.click(badge);

    const openLogsBtn = screen.getByText(/Consola de Logs/i);
    expect(openLogsBtn).toBeInTheDocument();
    fireEvent.click(openLogsBtn);

    const logModalTitle = screen.getByText(/Comunicación entre IAs/i);
    expect(logModalTitle).toBeInTheDocument();
  });
});
