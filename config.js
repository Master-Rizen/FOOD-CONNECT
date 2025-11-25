class Config {
    static get supabase() {
        const SUPABASE_URL = 'https://igkifihnfueqtfimvfvb.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna2lmaWhuZnVlcXRmaW12ZnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjgxNTAsImV4cCI6MjA3NDA0NDE1MH0.ZuwYi0BmIbOZxqEo1vASWWXP6Ga0kGeIKEg3F2dQg9k';
        //incase of error in connecting to database
        try {
            return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            throw new Error('Sorry initialization failed please contact rizen');
        }
    }
}

const supabase = Config.supabase;