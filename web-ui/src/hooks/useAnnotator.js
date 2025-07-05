import { useState, useCallback } from 'react';
import UniversalAnnotator from '../components/UniversalAnnotator';

export function useAnnotator() {
  const [isAnnotatorOpen, setIsAnnotatorOpen] = useState(false);
  const [annotatorProps, setAnnotatorProps] = useState(null);

  const openAnnotator = useCallback((props) => {
    setAnnotatorProps(props);
    setIsAnnotatorOpen(true);
  }, []);

  const closeAnnotator = useCallback(() => {
    setIsAnnotatorOpen(false);
    setAnnotatorProps(null);
  }, []);

  const AnnotatorComponent = isAnnotatorOpen && annotatorProps ? (
    <UniversalAnnotator
      {...annotatorProps}
      onClose={closeAnnotator}
    />
  ) : null;

  return {
    openAnnotator,
    closeAnnotator,
    isAnnotatorOpen,
    AnnotatorComponent
  };
}