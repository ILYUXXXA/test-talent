import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDown, ArrowRight, Menu, X, Compass, Trophy, Network, GraduationCap, School, Building2, Heart, Asterisk, Mail, Send } from "lucide-react";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../components/LandingUI.jsx";
import "../styles/talent-connect-landing.css";
import sculpture from "../assets/landing/talenthub-sculpture.jpg";
import { contacts } from "../data/contacts.js";
import teamPhoto from "../assets/landing/team_photo.jpg";

import studentsArt from "../assets/landing/illustrations/students.png";
import parentsArt from "../assets/landing/illustrations/parents.png";
import schoolsArt from "../assets/landing/illustrations/schools.png";
import companiesArt from "../assets/landing/illustrations/companies.png";

const audiences = [
  {
    image: studentsArt, imageAlt: "Путь от новых знаний к достижениям",
    id: "students", title: "Школьникам", role: "student", icon: GraduationCap,
    headline: "Твой интерес.\nТвой следующий шаг.",
    description: "Ищи то, что увлекает, пробуй новое и собирай свой образовательный путь — от первой заявки до подтверждённого достижения.",
    action: "Войти или зарегистрироваться",
    features: [
      { icon: Compass, title: "Находи своё", text: "Олимпиады, конкурсы, проектные смены и образовательные программы. Выбирай события по интересам, городу и формату." },
      { icon: ArrowUpRight, title: "Подавай заявки", text: "Записывайся на мероприятия и следи за статусом заявки в личном кабинете. Уведомления помогут заметить изменения." },
      { icon: Trophy, title: "Сохраняй результаты", text: "Просматривай историю участия и подтверждённые достижения. Интересы в профиле помогают находить подходящие возможности." },
    ],
  },
  {
    image: parentsArt, imageAlt: "Поддержка и развитие ребёнка",
    id: "parents", title: "Родителям", role: "parent", icon: Heart,
    headline: "Рядом на каждом\nэтапе развития.",
    description: "Помогайте ребёнку открывать новые возможности и следите за его образовательным прогрессом в одном кабинете.",
    action: "Создать аккаунт или войти",
    features: [
      { icon: Heart, title: "Все дети в одном кабинете", text: "Создайте семейную ссылку и отправьте её детям. После входа по ссылке их профили появятся в вашем кабинете." },
      { icon: Trophy, title: "Прогресс перед глазами", text: "Смотрите заявки, посещённые мероприятия и достижения ребёнка. Важные этапы его образовательного пути собраны вместе." },
      { icon: Compass, title: "Помогайте с выбором", text: "Находите мероприятия и предлагайте их ребёнку. Изучайте школы, их программы и показатели по подтверждённым достижениям." },
    ],
  },
  {
    image: schoolsArt, imageAlt: "Школа как пространство новых возможностей",
    id: "schools", title: "Школам", role: "school", icon: School,
    headline: "Возможности\nдля всей школы.",
    description: "Объедините работу с мероприятиями, учениками и партнёрами. Создавайте инициативы и отслеживайте реальные результаты участия.",
    action: "Войти в кабинет школы",
    features: [
      { icon: School, title: "Публикуйте мероприятия", text: "Создавайте олимпиады и проектные программы, задавайте даты, условия и количество мест. После модерации события появляются в каталоге." },
      { icon: GraduationCap, title: "Работайте с участниками", text: "Рассматривайте заявки и отмечайте посещения. В кабинете доступны сведения об активности и достижениях учащихся." },
      { icon: Network, title: "Находите партнёров", text: "Отправляйте предложения компаниям, публикуйте открытые запросы и отвечайте на инициативы партнёров. История сотрудничества остаётся в кабинете." },
    ],
  },
  {
    image: companiesArt, imageAlt: "Мост между образованием и компаниями",
    id: "companies", title: "Компаниям", role: "company", icon: Building2,
    headline: "Инициативы,\nкоторые объединяют.",
    description: "Делитесь опытом и создавайте образовательные программы для школьников. Находите учреждения, которым нужны ваши знания и возможности.",
    action: "Войти в кабинет компании",
    features: [
      { icon: Building2, title: "Предлагайте программы", text: "Публикуйте мастер-классы, экскурсии, конкурсы и другие образовательные инициативы. Управляйте своими мероприятиями и заявками участников." },
      { icon: Network, title: "Сотрудничайте со школами", text: "Изучайте каталог учреждений, отправляйте адресные предложения и откликайтесь на открытые запросы школ." },
      { icon: ArrowRight, title: "Следите за договорённостями", text: "Просматривайте входящие обращения, статусы запросов и историю партнёрств. Держите совместные инициативы в одной рабочей среде." },
    ],
  },
];
const navigation = [
  ...audiences.map(item => [`#${item.id}`, item.title]),
  ["#contacts", "Контакты"],
];

function AudienceSection({ item }) {
  return <section id={item.id} className={`kt-section kt-role-section kt-role-${item.role}`} aria-labelledby={`${item.id}-title`}>
    <div className="kt-chapter-content">
      <div className="kt-chapter-copy kt-reveal">
        <h2 id={`${item.id}-title`}>{item.headline.split('\n').map((line, i) => <span key={line} className={i ? 'kt-role-accent' : undefined}>{line}</span>)}</h2>
        <p className="kt-chapter-description">{item.description}</p>
        <Button asChild className="kt-cta"><Link to={`/auth?role=${item.role}`}>{item.action}<ArrowUpRight aria-hidden="true" /></Link></Button>
        <div className="kt-chapter-features">{item.features.map(feature => <article className="kt-chapter-feature" key={feature.title}>
          <feature.icon aria-hidden="true" /><div><h3>{feature.title}</h3><p>{feature.text}</p></div>
        </article>)}</div>
      </div>
      <div className="kt-section-visual kt-reveal"><img src={item.image} width={1280} height={1280} loading="lazy" alt={item.imageAlt} /></div>
    </div>
  </section>;
}

export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [join, setJoin] = useState(false);
  const [activeSection, setActiveSection] = useState('top');
  const headerTheme = activeSection === 'companies' ? 'blue'
    : ['schools', 'contacts'].includes(activeSection) ? 'dark'
    : activeSection === 'parents' ? 'soft' : 'light';
  const root = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menu]);
  useEffect(() => {
    const elements = root.current?.querySelectorAll(".kt-reveal");
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    elements?.forEach(el => observer.observe(el));
    // The API loading boundary can mount the landing after the browser's initial hash scroll.
    const hash = window.location.hash;
    let alignHash = navigation.some(([href]) => href === hash);
    const align = () => {
      if (alignHash && window.location.hash === hash) root.current?.querySelector(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    };
    const cancelAlignment = () => { alignHash = false; };
    align();
    document.fonts.ready.then(align);
    window.addEventListener('wheel', cancelAlignment, { passive: true });
    window.addEventListener('touchstart', cancelAlignment, { passive: true });
    window.addEventListener('keydown', cancelAlignment);
    return () => {
      alignHash = false;
      observer.disconnect();
      window.removeEventListener('wheel', cancelAlignment);
      window.removeEventListener('touchstart', cancelAlignment);
      window.removeEventListener('keydown', cancelAlignment);
    };
  }, []);
  useEffect(() => {
    const page = root.current;
    const header = page?.querySelector('.kt-header');
    const sections = Array.from(page?.querySelectorAll('section.kt-section[id]') || []);
    if (!header) return;
    let frame = 0;
    let previous = '';
    const update = () => {
      frame = 0;
      const edge = header.getBoundingClientRect().height + 1;
      let current = 'top';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= edge) current = section.id;
      }
      if (previous !== current) { previous = current; setActiveSection(current); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <>
    <main id="top" className="kt th-landing" ref={root}>
      <header className="kt-header" data-theme={headerTheme}>
        <a href="#top" className="kt-logo" aria-label="TalentHub — вернуться в начало страницы" onClick={event => { event.preventDefault(); window.history.replaceState(null, "", window.location.pathname + window.location.search); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span className="kt-logo-mark">t.</span><span>Talent<span>Hub</span></span></a>
        <nav id="landing-navigation" className={menu ? "kt-nav is-open" : "kt-nav"} aria-label="Основная навигация">
          {navigation.map(([href, label]) => <Button asChild variant="ghost" key={href}><a href={href} aria-current={activeSection === href.slice(1) ? "location" : undefined} onClick={() => setMenu(false)}>{label}</a></Button>)}
        </nav>
        <div className="kt-header-actions"><Button asChild className="kt-login" variant="outline"><Link to="/auth">Войти <ArrowRight /></Link></Button><Button className="kt-menu" variant="ghost" size="icon" aria-controls="landing-navigation" aria-expanded={menu} aria-label={menu ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</Button></div>
      </header>
      <div className="kt-opening">
      <section className="kt-hero">
        <div className="kt-hero-top"><span><span className="kt-live" /> ОБРАЗОВАТЕЛЬНАЯ ЭКОСИСТЕМА</span><span><Asterisk size={16} /></span></div>
        <div className="kt-hero-copy">
        <h1><span className="kt-line-one">Твои возможности</span><button type="button" className="kt-line-two" onClick={() => setJoin(true)} aria-haspopup="dialog">В одном месте <ArrowUpRight aria-hidden="true" /></button></h1>
        <div className="kt-hero-bottom"><div><p>TalentHub — это образовательная экосистема, которая объединяет школьников, родителей, школы, компании и образовательные организации вокруг развития талантов, образовательных возможностей и достижений.</p><div className="kt-hero-actions"><Button className="kt-cta" onClick={() => setJoin(true)}>Открыть TalentHub <ArrowUpRight /></Button></div></div></div>
        </div>
        <div className="kt-hero-art-frame"><img className="kt-hero-art" src={sculpture} width={1920} height={1024} alt="Синяя скульптура в форме звезды" /></div>
        <div className="kt-hero-footer"><span>ЛЮДИ / ИДЕИ / ВОЗМОЖНОСТИ</span><a href="#students" aria-label="Перейти к разделу для школьников"><ArrowDown /></a><span>ТВОЙ СЛЕДУЮЩИЙ ШАГ ↓</span></div>
      </section>
      <div className="kt-ticker" aria-hidden="true"><div>{Array.from({ length: 4 }, (_, i) => <span key={i}>НАХОДИ <Asterisk /> УЧАСТВУЙ <Asterisk /> СОЗДАВАЙ <Asterisk /></span>)}</div></div>
      </div>
      {audiences.map(item => <AudienceSection item={item} key={item.id} />)}
      <section className="kt-section kt-contacts" id="contacts" aria-labelledby="contacts-title">
        <div className="kt-contacts-content">
          <div className="kt-reveal">
            <h2 id="contacts-title">Давайте создавать<br /><span>возможности вместе.</span></h2>
            <p>Хотите узнать больше о TalentHub или обсудить образовательный проект? Свяжитесь с командой.</p>
            <div className="kt-contact-links">{contacts.map(item => {
              const Element = item.href ? 'a' : 'article';
              return <Element className="kt-contact-card" href={item.href || undefined} key={item.label}>
                <item.icon aria-hidden="true" />
                <div><span>{item.label}</span><strong>{item.value || 'Скоро добавим'}</strong></div>
                {item.href ? <ArrowUpRight aria-hidden="true" /> : null}
              </Element>;
            })}</div>
          </div>
          <figure className="kt-contact-team kt-reveal">
            <div className="kt-audience-image"><img src={teamPhoto} width={1280} height={720} loading="lazy" alt="Команда TalentHub" /></div>
            <figcaption><strong>Команда TalentHub</strong><span>Соединяем людей, идеи и образовательные возможности.</span></figcaption>
          </figure>
        </div>
        <div className="kt-contact-topics kt-reveal" aria-label="С чем можно обратиться">
          <article><Mail aria-hidden="true" /><h3>Вопросы о платформе</h3><p>Поможем разобраться с регистрацией, кабинетом, мероприятиями и участием в TalentHub.</p></article>
          <article><Network aria-hidden="true" /><h3>Образовательные проекты</h3><p>Обсудим программы для школьников, инициативы школ и сотрудничество с компаниями.</p></article>
          <article><Send aria-hidden="true" /><h3>Идеи и обратная связь</h3><p>Расскажите, чего вам не хватает, предложите улучшение или сообщите о проблеме.</p></article>
        </div>
      </section>
      <footer className="kt-footer"><Link to="/" className="kt-logo"><span className="kt-logo-mark">t.</span><span>Talent<span>Hub</span></span></Link><span>Образовательная экосистема возможностей и партнёрств</span><span>© TalentHub</span><Button asChild size="icon" variant="ghost"><a href="#top" aria-label="Вернуться наверх"><ArrowUpRight /></a></Button></footer>
    </main>
    <Dialog open={join} onOpenChange={setJoin}><DialogContent className="kt-join"><DialogTitle>С чего начнём?</DialogTitle><DialogDescription>Выберите, как вы хотите использовать TalentHub. Дальше откроется единая форма входа и регистрации.</DialogDescription><div className="kt-join-roles">{audiences.map(item => <Button key={item.title} asChild variant="outline"><Link to={`/auth?role=${item.role}`} onClick={() => setJoin(false)} aria-label={`Продолжить как: ${item.title}`}><item.icon />{item.title}<ArrowUpRight /></Link></Button>)}</div></DialogContent></Dialog>
  </>;
}
