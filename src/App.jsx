import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicOnly, RequireAuth, RequireProfile } from './components/RouteGuards'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Home from './pages/Home'
import Progress from './pages/Progress'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route element={<RequireProfile />}>
            <Route index element={<Home />} />
            <Route path="/progress" element={<Progress />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
