import { useState } from 'react';
import { pendingInvitationPath } from '../data/family-invitation.js';
import { useNavigate } from 'react-router-dom';
import { listUpcoming, completeProfile, GRADES, CITIES, INTERESTS } from '../data/store.js';

function labelOf(item) {
  if (item != null && typeof item === 'object') {
    return String(item.label || item.name || item.title || item.id || item.value || '');
  }
  return String(item);
}

function valueOf(item) {
  if (item != null && typeof item === 'object') {
    return String(item.id ?? item.value ?? item.label ?? item.name ?? '');
  }
  return String(item);
}

function storedValue(item) {
  if (item != null && typeof item === 'object') {
    if (item.id != null) return item.id;
    if (item.value != null) return item.value;
    return item.label || item.name;
  }
  return item;
}

function listOr(source, fallback) {
  try {
    if (Array.isArray(source) && source.length > 0) return source;
  } catch {
    /* keep the screen filled */
  }
  return fallback;
}

function loadUpcoming() {
  try {
    const live = listUpcoming();
    if (Array.isArray(live) && live.some((event) => event && event.title)) return live;
  } catch {
    /* dimmed list still has to show */
  }
  return [];
}

export default function FirstLogin() {
  const navigate = useNavigate();
  const [upcoming] = useState(loadUpcoming);
  const grades = listOr(GRADES, []);
  const cities = listOr(CITIES, []);
  const interests = listOr(INTERESTS, []);
  const [grade, setGrade] = useState('');
  const [city, setCity] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');

  function toggle(value) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!grade || !city || selected.length < 1) {
      setError('Выберите класс, город и хотя бы один интерес.');
      return;
    }
    const gradeItem = grades.find((item) => valueOf(item) === grade);
    const cityItem = cities.find((item) => valueOf(item) === city);
    const picked = interests.filter((item) => selected.includes(valueOf(item))).map(storedValue);
    try {
      await completeProfile({
        grade: gradeItem == null ? grade : storedValue(gradeItem),
        city: cityItem == null ? city : storedValue(cityItem),
        interests: picked,
      });
    } catch (error) {
      setError(error.message || 'Не удалось сохранить профиль.');
      return;
    }
    navigate(pendingInvitationPath() || '/events');
  }

  return (
    <main className="student-workspace">
      <div className="container">
        <div className="dim-wrap">
          <div className="dimmed">
            <div className="grid-2">
              {upcoming.map((event, index) => (
                <article className="card" key={`${event.title}-${event.date}-${index}`}>
                  <h2 className="card-title">{event.title}</h2>
                  <p className="muted">
                    {event.date}
                    {event.city ? ` · ${event.city}` : ''}
                  </p>
                  <span className="badge badge-muted">
                    {event.category === 'project' ? 'Проектная деятельность' : 'Олимпиада'}
                  </span>
                </article>
              ))}
            </div>
          </div>
          <form className="modal-card" onSubmit={onSubmit}>
            <h1 className="title">Заполните профиль</h1>
            <p className="lead">
              Класс, город и интересы нужны, чтобы показать подходящие мероприятия. Список событий сзади приглушён.
            </p>
            <label className="field">
              <span>Класс</span>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
                <option value="">Выберите класс</option>
                {grades.map((item) => (
                  <option key={valueOf(item)} value={valueOf(item)}>{labelOf(item)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Город</span>
              <select value={city} onChange={(e) => setCity(e.target.value)} required>
                <option value="">Выберите город</option>
                {cities.map((item) => (
                  <option key={valueOf(item)} value={valueOf(item)}>{labelOf(item)}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="muted">Интересы</span>
              <div className="row">
                {interests.map((item) => {
                  const value = valueOf(item);
                  const active = selected.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      className={active ? 'chip active' : 'chip'}
                      onClick={() => toggle(value)}
                    >
                      {labelOf(item)}
                    </button>
                  );
                })}
              </div>
            </div>
            {error ? <p className="notice">{error}</p> : null}
            <button className="btn btn-primary" type="submit">Показать мероприятия</button>
            
          </form>
        </div>
      </div>
    </main>
  );
}
