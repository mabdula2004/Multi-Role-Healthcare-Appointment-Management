export const doctors = [
  { id:'d1', name:'Dr. Sarah Malik', specialty:'Cardiology', clinic:'Medora Heart Centre', location:'Lahore', rating:4.9, reviews:184, experience:12, fee:4500, mode:['In-person','Video'], next:'Today · 5:30 PM', gender:'Female', languages:['English','Urdu'], image:'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=85', about:'Consultant cardiologist focused on preventive heart care, hypertension and long-term cardiac wellness.' },
  { id:'d2', name:'Dr. Hamza Qureshi', specialty:'Dermatology', clinic:'Skinwell Medical Studio', location:'Lahore', rating:4.8, reviews:239, experience:9, fee:3200, mode:['In-person','Video'], next:'Tomorrow · 11:00 AM', gender:'Male', languages:['English','Urdu','Punjabi'], image:'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=700&q=85', about:'Dermatologist treating acne, eczema, hair loss and common inflammatory skin conditions.' },
  { id:'d3', name:'Dr. Ayesha Rahman', specialty:'Pediatrics', clinic:'Little Steps Clinic', location:'Islamabad', rating:4.9, reviews:312, experience:14, fee:3800, mode:['In-person'], next:'Mon · 9:30 AM', gender:'Female', languages:['English','Urdu'], image:'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=700&q=85', about:'Pediatrician supporting newborn care, childhood wellness and developmental health.' },
  { id:'d4', name:'Dr. Bilal Ahmed', specialty:'Orthopedics', clinic:'Motion Ortho Institute', location:'Karachi', rating:4.7, reviews:167, experience:16, fee:5000, mode:['In-person','Video'], next:'Tue · 3:00 PM', gender:'Male', languages:['English','Urdu'], image:'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=85', about:'Orthopedic surgeon with interests in sports injuries, joint pain and mobility recovery.' },
  { id:'d5', name:'Dr. Noor Fatima', specialty:'Psychiatry', clinic:'Mindspace Health', location:'Lahore', rating:4.9, reviews:126, experience:11, fee:4200, mode:['Video','In-person'], next:'Today · 7:00 PM', gender:'Female', languages:['English','Urdu'], image:'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=700&q=85', about:'Psychiatrist providing evidence-based support for anxiety, mood disorders and burnout.' },
  { id:'d6', name:'Dr. Zain Farooq', specialty:'Neurology', clinic:'NeuroCare Associates', location:'Islamabad', rating:4.8, reviews:201, experience:13, fee:5200, mode:['In-person','Video'], next:'Wed · 1:30 PM', gender:'Male', languages:['English','Urdu'], image:'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=85', about:'Neurologist focused on migraine, neuropathy and long-term neurological care.' }
]

export const specialties = [
  ['Cardiology','Heart & circulation','♥'],['Dermatology','Skin, hair & nails','✦'],['Pediatrics','Child healthcare','◎'],['Orthopedics','Bones & joints','◇'],['Psychiatry','Mental wellbeing','◌'],['Neurology','Brain & nerves','⌁'],['General Medicine','Primary care','＋'],['Gynecology','Women’s health','◐']
]

export const appointments = [
  { id:'APT-2048', doctor:'Dr. Sarah Malik', specialty:'Cardiology', date:'Oct 04, 2026', time:'5:30 PM', type:'In-person', status:'Confirmed', location:'Medora Heart Centre' },
  { id:'APT-1982', doctor:'Dr. Hamza Qureshi', specialty:'Dermatology', date:'Sep 18, 2026', time:'11:00 AM', type:'Video', status:'Completed', location:'Online consultation' },
  { id:'APT-1844', doctor:'Dr. Noor Fatima', specialty:'Psychiatry', date:'Aug 21, 2026', time:'7:00 PM', type:'Video', status:'Completed', location:'Online consultation' }
]

export const adminStats = [
  ['Active patients','12,482','+8.2%'],['Verified doctors','438','+14'],['Appointments today','286','91% filled'],['Monthly revenue','PKR 8.4M','+11.7%']
]
