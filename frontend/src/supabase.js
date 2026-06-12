import {
  createClient
} from "@supabase/supabase-js";

const supabase =
  createClient(

    "https://dpwqanpfqxrewkrllgts.supabase.co",

    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwd3FhbnBmcXhyZXdrcmxsZ3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTczMDksImV4cCI6MjA5NDMzMzMwOX0.vbbeErSuUamjdhf3mHfuWhtH_De8IMTuE8z3R8wtH2c"

  );

export default supabase;