import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModelManagerModal from './ModelManagerModal';

describe('ModelManagerModal Component', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/api/models/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            results: [
              {
                id: 'magnum-v4-12b-Q4_K_M.gguf',
                name: 'Magnum v4 12B',
                category: 'roleplay',
                categoryLabel: 'Rol Narrativo',
                description: 'Modelo sin censura',
                formattedSize: '7.48 GB',
                downloadUrl: 'https://huggingface.co/test/magnum.gguf',
                tags: ['Uncensored', 'Roleplay'],
                hardwareFit: { status: 'optimal', badgeText: '🟢 Óptimo (100% VRAM)', color: '#6ee7b7' }
              }
            ]
          })
        });
      }

      if (url.includes('/api/models/downloads')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, tasks: [] })
        });
      }

      // Default GET /api/models
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          models: [
            {
              id: 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf',
              filename: 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf',
              type: 'llm',
              formattedSize: '7.48 GB',
              hardwareFit: { status: 'optimal', badgeText: '🟢 Óptimo' }
            }
          ],
          activeModel: 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf',
          hardware: { ramGb: 32, freeRamGb: 20, vramGb: 12 }
        })
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders modal header, hardware stats, and installed models', async () => {
    render(<ModelManagerModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Gestor de Modelos e Inteligencia Artificial/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf')).toBeInTheDocument();
      expect(screen.getByText(/Activo en VRAM/i)).toBeInTheDocument();
    });
  });

  test('switches tabs between Installed, Hugging Face, and Import', async () => {
    render(<ModelManagerModal isOpen={true} onClose={() => {}} />);

    // Switch to Hugging Face tab
    const searchTabBtn = screen.getByText(/Descubrir en Hugging Face/i);
    fireEvent.click(searchTabBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar modelos en Hugging Face/i)).toBeInTheDocument();
      expect(screen.getByText('Magnum v4 12B')).toBeInTheDocument();
      expect(screen.getByText(/Descargar/i)).toBeInTheDocument();
    });

    // Switch to Import from PC tab
    const importTabBtn = screen.getByText(/Importar desde tu PC/i);
    fireEvent.click(importTabBtn);

    expect(screen.getByPlaceholderText(/Pega la ruta absoluta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Importar$/i })).toBeInTheDocument();
  });
});
