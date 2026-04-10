import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './Dashboard/DashboardPage';
import ProjectPage from './Project/ProjectPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;