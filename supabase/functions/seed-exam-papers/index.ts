import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVINCES = [
  "Common Papers", "Eastern Cape", "Free State", "Gauteng",
  "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West",
  "Northern Cape", "Western Cape",
];
const TERMS = ["Term 1", "Term 2", "Term 3", "Term 4"];
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all subjects for grades 10-12
    const { data: grades } = await supabase
      .from("grades")
      .select("id, name")
      .in("name", ["Grade 10", "Grade 11", "Grade 12"]);

    if (!grades) {
      return new Response(JSON.stringify({ error: "No grades found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gradeIds = grades.map((g: any) => g.id);
    const gradeNameMap: Record<string, string> = {};
    grades.forEach((g: any) => { gradeNameMap[g.id] = g.name; });

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name, grade_id")
      .in("grade_id", gradeIds);

    if (!subjects || subjects.length === 0) {
      return new Response(JSON.stringify({ error: "No subjects found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalInserted = 0;
    let skipped = 0;

    // Process each subject in batches
    for (const subject of subjects) {
      const gradeName = gradeNameMap[subject.grade_id];
      const rows = [];

      for (const province of PROVINCES) {
        for (const term of TERMS) {
          for (const year of YEARS) {
            rows.push({
              subject_id: subject.id,
              province,
              term,
              year,
              title: `${subject.name} - ${province} ${term} ${year} (${gradeName})`,
            });
          }
        }
      }

      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error, data } = await supabase
          .from("exam_papers")
          .upsert(batch, { onConflict: "subject_id,province,term,year", ignoreDuplicates: true });
        
        if (error) {
          console.error(`Error for ${subject.name}:`, error.message);
          skipped += batch.length;
        } else {
          totalInserted += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Seeding complete",
        subjects: subjects.length,
        total_inserted: totalInserted,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
