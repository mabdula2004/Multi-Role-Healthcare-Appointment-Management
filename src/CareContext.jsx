import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile, listDoctors } from './careApi'

const CareContext = createContext(null)
export function CareProvider({ children }) {
  const [doctors, setDoctors] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  useEffect(() => {
    let active = true
    listDoctors().then(data => { if (active) setDoctors(data) })
      .catch(error => { if (active) setCatalogError(error.message) })
      .finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true, generation = 0
    const update = async next => {
      const request = ++generation
      setSession(next); setProfile(null); setAuthLoading(true); setAuthError('')
      try {
        const value = next ? await getProfile(next.user.id) : null
        if (active && request === generation) setProfile(value)
      } catch (error) {
        if (active && request === generation) setAuthError(error.message)
      } finally {
        if (active && request === generation) setAuthLoading(false)
      }
    }
    // Defer work out of the Auth callback to avoid waiting on the auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setTimeout(() => { if (active) update(next) }, 0)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) { setAuthError(error.message); setAuthLoading(false) }
      else update(data.session)
    })
    return () => { active = false; generation++; subscription.unsubscribe() }
  }, [])
  return <CareContext.Provider value={{ doctors, catalogLoading, catalogError, session, profile, authLoading, authError }}>{children}</CareContext.Provider>
}
export const useCare = () => useContext(CareContext)
