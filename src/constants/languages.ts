import type { SupportedLanguage } from '../types/codexam';

export interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  extension: string;
  hljsLang: string;
  defaultFilename: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: 'C++', label: 'C++', extension: '.cpp', hljsLang: 'cpp', defaultFilename: 'solution.cpp' },
  { value: 'Python', label: 'Python', extension: '.py', hljsLang: 'python', defaultFilename: 'solution.py' },
  { value: 'Java', label: 'Java', extension: '.java', hljsLang: 'java', defaultFilename: 'Solution.java' },
  { value: 'JavaScript', label: 'JavaScript', extension: '.js', hljsLang: 'javascript', defaultFilename: 'solution.js' },
  { value: 'C', label: 'C', extension: '.c', hljsLang: 'c', defaultFilename: 'solution.c' },
  { value: 'SQL', label: 'SQL', extension: '.sql', hljsLang: 'sql', defaultFilename: 'query.sql' },
];

export function getLanguageMeta(language: SupportedLanguage): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.value === language) ?? SUPPORTED_LANGUAGES[0];
}

export function inferLanguageFromFilename(filename: string): SupportedLanguage | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx') || lower.endsWith('.hpp')) {
    return 'C++';
  }
  if (lower.endsWith('.py')) return 'Python';
  if (lower.endsWith('.java')) return 'Java';
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'JavaScript';
  if (lower.endsWith('.c') || lower.endsWith('.h')) return 'C';
  if (lower.endsWith('.sql')) return 'SQL';
  return null;
}

export const SAMPLE_BUGGY_CPP = `#include <iostream>
using namespace std;

// Computes average and max of dynamically allocated student scores
int* createScoreArray(int n) {
    int* arr = new int[n];
    for (int i = 0; i <= n; i++) { // Bug 1: off-by-one heap buffer overflow
        cin >> arr[i];
    }
    return arr;
}

int findMax(int* arr, int n) {
    int ans = 0; // Bug 2: fails if all scores are negative or array is empty
    for (int i = 0; i < n; i++) {
        if (arr[i] > ans) {
            ans = arr[i];
        }
    }
    return ans;
}

int main() {
    int n;
    cout << "Enter number of students: ";
    cin >> n;

    // Bug 3: no validation if n <= 0
    int* scores = createScoreArray(n);

    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += scores[i];
    }

    double temp = sum / n; // Bug 4: integer division truncates decimals
    cout << "Average: " << temp << endl;
    cout << "Highest: " << findMax(scores, n) << endl;

    // Bug 5: memory leak — scores is never freed with delete[]
    return 0;
}
`;
