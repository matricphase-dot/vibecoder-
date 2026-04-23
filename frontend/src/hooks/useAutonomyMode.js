// frontend/src/hooks/useAutonomyMode.js
import { useAutonomy } from '../components/AutonomySlider';

export const useAutonomyMode = () => {
  const { mode, setMode, isSuggest, isAssist, isAgent } = useAutonomy();
  return { mode, setMode, isSuggest, isAssist, isAgent };
};
