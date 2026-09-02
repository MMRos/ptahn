import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScenarioMediaHeader from './ScenarioMediaHeader';

const MOCK_CATEGORIES = ['Acción', 'Aventura', 'Cyberpunk', 'Fantasía Épica', 'Terror'];

describe('ScenarioMediaHeader Component', () => {
  const defaultProps = {
    cover: '',
    onCoverChange: jest.fn(),
    category: 'Fantasía Épica',
    onCategoryChange: jest.fn(),
    categories: MOCK_CATEGORIES,
    tags: ['Magia', 'Dragones'],
    onTagsChange: jest.fn(),
    onOpenCropper: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Left Column: Cover Image & Upload', () => {
    test('WHEN cover is empty THEN renders placeholder "CARGAR IMAGEN"', () => {
      render(<ScenarioMediaHeader {...defaultProps} cover="" />);

      expect(screen.getByText(/cargar imagen/i)).toBeInTheDocument();
      expect(screen.queryByAltText(/portada del escenario/i)).not.toBeInTheDocument();
    });

    test('WHEN user clicks placeholder THEN triggers hidden file input', () => {
      render(<ScenarioMediaHeader {...defaultProps} cover="" />);

      const fileInput = screen.getByTestId('scenario-cover-file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      const placeholder = screen.getByText(/cargar imagen/i);
      fireEvent.click(placeholder);

      expect(clickSpy).toHaveBeenCalled();
    });

    test('WHEN cover is provided THEN renders preview with crop and remove buttons', () => {
      render(<ScenarioMediaHeader {...defaultProps} cover="https://example.com/cover.jpg" />);

      const img = screen.getByAltText(/portada del escenario/i);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');

      const cropBtn = screen.getByTitle(/recortar imagen/i);
      expect(cropBtn).toBeInTheDocument();
      fireEvent.click(cropBtn);
      expect(defaultProps.onOpenCropper).toHaveBeenCalledWith('https://example.com/cover.jpg');

      const removeBtn = screen.getByTitle(/eliminar imagen de portada/i);
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(defaultProps.onCoverChange).toHaveBeenCalledWith('');
    });
  });

  describe('Right Column: URL Input & Smart CARGAR Button', () => {
    test('WHEN typing URL and clicking CARGAR THEN updates cover and clears input', () => {
      render(<ScenarioMediaHeader {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText(/^url/i);
      fireEvent.change(urlInput, { target: { value: 'https://example.com/new-cover.png' } });

      const loadBtn = screen.getByRole('button', { name: /^cargar$/i });
      fireEvent.click(loadBtn);

      expect(defaultProps.onCoverChange).toHaveBeenCalledWith('https://example.com/new-cover.png');
      expect(urlInput.value).toBe('');
    });

    test('WHEN typing URL and pressing Enter THEN updates cover and clears input', () => {
      render(<ScenarioMediaHeader {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText(/^url/i);
      fireEvent.change(urlInput, { target: { value: 'https://example.com/enter-cover.png' } });
      fireEvent.keyDown(urlInput, { key: 'Enter', code: 'Enter' });

      expect(defaultProps.onCoverChange).toHaveBeenCalledWith('https://example.com/enter-cover.png');
      expect(urlInput.value).toBe('');
    });

    test('WHEN URL input is empty and clicking CARGAR THEN triggers file picker', () => {
      render(<ScenarioMediaHeader {...defaultProps} />);

      const fileInput = screen.getByTestId('scenario-cover-file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      const loadBtn = screen.getByRole('button', { name: /^cargar$/i });
      fireEvent.click(loadBtn);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Right Column: Category Dropdown', () => {
    test('WHEN changing category THEN calls onCategoryChange with new category', () => {
      render(<ScenarioMediaHeader {...defaultProps} />);

      const select = screen.getByTestId('scenario-category-select');
      expect(select.value).toBe('Fantasía Épica');

      fireEvent.change(select, { target: { value: 'Cyberpunk' } });
      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith('Cyberpunk');
    });
  });

  describe('Right Column: Tags Management', () => {
    test('WHEN rendering tags THEN displays tag chips without superfluous label text', () => {
      render(<ScenarioMediaHeader {...defaultProps} tags={['Magia', 'Dragones']} />);

      expect(screen.getByText('Magia')).toBeInTheDocument();
      expect(screen.getByText('Dragones')).toBeInTheDocument();
      expect(screen.queryByText(/aquí irán las etiquetas/i)).not.toBeInTheDocument();
    });

    test('WHEN clicking remove tag chip THEN calls onTagsChange without that tag', () => {
      render(<ScenarioMediaHeader {...defaultProps} tags={['Magia', 'Dragones']} />);

      const removeMagiaBtn = screen.getByTestId('remove-tag-Magia');
      fireEvent.click(removeMagiaBtn);

      expect(defaultProps.onTagsChange).toHaveBeenCalledWith(['Dragones']);
    });

    test('WHEN typing tag and pressing Enter THEN adds trimmed tag', () => {
      render(<ScenarioMediaHeader {...defaultProps} tags={['Magia']} />);

      const tagInput = screen.getByPlaceholderText(/etiquetas/i);
      fireEvent.change(tagInput, { target: { value: ' Reino ' } });
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

      expect(defaultProps.onTagsChange).toHaveBeenCalledWith(['Magia', 'Reino']);
      expect(tagInput.value).toBe('');
    });

    test('WHEN adding duplicate tag THEN ignores and does not add duplicate', () => {
      render(<ScenarioMediaHeader {...defaultProps} tags={['Magia', 'Dragones']} />);

      const tagInput = screen.getByPlaceholderText(/etiquetas/i);
      fireEvent.change(tagInput, { target: { value: 'Magia' } });
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

      expect(defaultProps.onTagsChange).not.toHaveBeenCalled();
    });

    test('WHEN 5 tags exist THEN tag input is disabled and informs user', () => {
      const fiveTags = ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5'];
      render(<ScenarioMediaHeader {...defaultProps} tags={fiveTags} />);

      const tagInput = screen.getByPlaceholderText(/máximo 5 etiquetas/i);
      expect(tagInput).toBeDisabled();
    });
  });

  describe('Right Column: AI Image Generation', () => {
    test('WHEN entering AI prompt and clicking Generar THEN calls onGenerateAiCover', () => {
      const onGenerateAiCover = jest.fn();
      render(
        <ScenarioMediaHeader
          {...defaultProps}
          onGenerateAiCover={onGenerateAiCover}
        />
      );

      const promptInput = screen.getByPlaceholderText(/descripción visual del escenario/i);
      fireEvent.change(promptInput, { target: { value: 'Castillo en las nubes, atardecer épico' } });

      const styleSelect = screen.getByTestId('scenario-ai-style-select');
      fireEvent.change(styleSelect, { target: { value: 'Anime / Ilustración Estilizada 2.5D' } });

      const generateBtn = screen.getByRole('button', { name: /generar/i });
      fireEvent.click(generateBtn);

      expect(onGenerateAiCover).toHaveBeenCalledWith('Castillo en las nubes, atardecer épico', 'Anime / Ilustración Estilizada 2.5D');
    });

    test('WHEN isGeneratingAi is true THEN Generar button is disabled', () => {
      render(
        <ScenarioMediaHeader
          {...defaultProps}
          isGeneratingAi={true}
        />
      );

      const generateBtn = screen.getByRole('button', { name: /generar/i });
      expect(generateBtn).toBeDisabled();
    });
  });
});
