import { NextResponse } from 'next/server';
//import { fetchCourses } from '@/lib/courses';

export async function GET() {
    try {
        return NextResponse.json({ error: 'DISABLED' }, { status: 500 });
        //const courses = await fetchCourses();
        //return NextResponse.json({ courses });
    } catch (error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}
