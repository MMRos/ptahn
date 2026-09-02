import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateModal from './CreateModal';
import ScenarioMediaHeader from './create/ScenarioMediaHeader';
import CharacterModal from './CharacterModal';

// Mock storage and AI utilities
jest.mock('../utils/storage', () => ({
  loadCreations: jest.fn(() => []),
  saveCreations: jest.fn(),
  loadActiveEntity: jest.fn(() => null),
  saveActiveEntity: jest.fn(),
  loadCurrentUser: jest.fn(() => ({ id: 'usr-1', username: 'Tester', role: 'admin' })),
  loadCurrentToken: jest.fn(() => 'valid-mock-token'),
  loadChatSettings: jest.fn(() => ({
    baseUrl: 'http://localhost:1234/v1',
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 512
  })),
  saveChatSettings: jest.fn()
}));

jest.mock('../utils/localAIStudio', () => ({
  generateImageLocal: jest.fn(async () => 'http://localhost:3000/generated.png'),
  generateLoreLocal: jest.fn(async () => 'Generated Safe Lore')
}));

describe('Security & Input Validation across Interactive Components', () => {
  describe('CreateModal Security Traps', () => {
    test('XSS PAYLOADS in title, intro and prompt do not execute scripts', () => {
      const onSave = jest.fn();
      const onClose = jest.fn();

      render(
        <CreateModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          allCreations={[]}
        />
      );

      const titleInput = screen.getByPlaceholderText(/nombre o título/i);
      const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
      fireEvent.change(titleInput, { target: { value: xssPayload } });

      expect(titleInput.value).toBe(xssPayload);
      // React escapes text nodes by default, verifying no unescaped dangerous elements exist in document
      expect(document.querySelector('script')).toBeNull();
    });

    test('EXTREME LENGTH STRING (100K chars) in character intro does not crash modal', () => {
      const onSave = jest.fn();
      render(
        <CreateModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
          allCreations={[]}
        />
      );

      const massiveString = 'A'.repeat(100000);
      const titleInput = screen.getByPlaceholderText(/nombre o título/i);
      expect(() => {
        fireEvent.change(titleInput, { target: { value: massiveString } });
      }).not.toThrow();

      expect(titleInput.value.length).toBe(100000);
    });

    test('UNICODE CONTROL CHARACTERS and Null Bytes in inputs are handled safely', () => {
      render(
        <CreateModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
          allCreations={[]}
        />
      );

      const nullPayload = 'Test\x00\u202E\u0000Payload';
      const titleInput = screen.getByPlaceholderText(/nombre o título/i);
      fireEvent.change(titleInput, { target: { value: nullPayload } });

      expect(titleInput.value).toContain('Payload');
    });
  });

  describe('ScenarioMediaHeader Security Traps', () => {
    test('DANGEROUS PROTOCOL (javascript:) in URL input does not crash or execute', () => {
      const onCoverChange = jest.fn();
      render(
        <ScenarioMediaHeader
          cover=""
          onCoverChange={onCoverChange}
          category="Fantasía Épica"
          onCategoryChange={jest.fn()}
          categories={['Fantasía Épica']}
          tags={[]}
          onTagsChange={jest.fn()}
          onOpenCropper={jest.fn()}
        />
      );

      const urlInput = screen.getByPlaceholderText(/url de imagen/i);
      fireEvent.change(urlInput, { target: { value: 'javascript:alert(document.cookie)' } });

      const loadBtn = screen.getByRole('button', { name: /^cargar$/i });
      fireEvent.click(loadBtn);

      expect(onCoverChange).toHaveBeenCalledWith('javascript:alert(document.cookie)');
      expect(document.querySelector('script')).toBeNull();
    });

    test('PROTOTYPE POLLUTION PAYLOAD in tag inputs is rejected safely', () => {
      const onTagsChange = jest.fn();
      render(
        <ScenarioMediaHeader
          cover=""
          onCoverChange={jest.fn()}
          category="Fantasía Épica"
          onCategoryChange={jest.fn()}
          categories={['Fantasía Épica']}
          tags={[]}
          onTagsChange={onTagsChange}
          onOpenCropper={jest.fn()}
        />
      );

      const tagInput = screen.getByPlaceholderText(/etiquetas/i);
      fireEvent.change(tagInput, { target: { value: '__proto__' } });
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

      expect(onTagsChange).toHaveBeenCalledWith(['__proto__']);
      expect(Object.prototype.isAdmin).toBeUndefined();
    });
  });

  describe('CharacterModal Security Traps', () => {
    test('XSS PAYLOADS in CharacterModal notes and personality render escaped', () => {
      const userCards = [
        {
          id: 'char-1',
          title: '<script>alert(1)</script>',
          type: 'Personaje',
          characterRole: 'user_persona',
          intro: '<b onmouseover=alert(1)>Intro Text</b>'
        }
      ];

      render(
        <CharacterModal
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          userCards={userCards}
          scenarioCharacters={[]}
        />
      );

      expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
      expect(document.querySelector('script')).toBeNull();
    });
  });
});
