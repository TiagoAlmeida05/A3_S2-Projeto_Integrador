import { HashRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './Dashboard/DashboardPage';
import ProjectPage from './Project/ProjectPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;