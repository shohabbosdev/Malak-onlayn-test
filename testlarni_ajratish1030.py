from bs4 import BeautifulSoup
import pandas as pd
import streamlit as st
import re
import json

st.title("JSON Quiz Parser (5 ustunli format)")

# Fayl yuklash interfeysi
uploaded_file = st.file_uploader("HTML faylni yuklang (masalan, 1. 1030 test.html)", type=['html'])
if uploaded_file is not None:
    # Faylni o'qish
    content = uploaded_file.read().decode('utf-8')
    soup = BeautifulSoup(content, 'html.parser')

    # <script> tegidagi quizData o'zgaruvchisini topish
    script_tags = soup.find_all('script')
    quiz_data = None
    for script in script_tags:
        if script.string and 'quizData' in script.string:
            # quizData = [...] qismini regex yordamida ajratish
            match = re.search(r'const quizData\s*=\s*(\[.*?\]);', script.string, re.DOTALL)
            if match:
                try:
                    quiz_data = json.loads(match.group(1))
                    break
                except json.JSONDecodeError as e:
                    st.error(f"JSON parse xatosi: {e}")
                    break

    if quiz_data:
        # Ma'lumotlarni saqlash uchun ro'yxatlar
        savollar = []
        togri_javoblar = []
        maqbul_javob_1 = []
        maqbul_javob_2 = []
        maqbul_javob_3 = []

        # Savollar va javoblarni ajratish
        for item in quiz_data:
            savollar.append(item['question'])
            togri_javoblar.append(item['answers'][item['correct']])
            
            # To'g'ri javobni chiqarib tashlab, qolgan javoblarni olish
            qolgan_javoblar = [item['answers'][key] for key in ['a', 'b', 'c', 'd'] if key != item['correct']]
            
            # Agar qolgan javoblar yetarli bo'lsa, ularni maqbul javoblar sifatida joylashtiramiz
            maqbul_javob_1.append(qolgan_javoblar[0] if len(qolgan_javoblar) > 0 else '')
            maqbul_javob_2.append(qolgan_javoblar[1] if len(qolgan_javoblar) > 1 else '')
            maqbul_javob_3.append(qolgan_javoblar[2] if len(qolgan_javoblar) > 2 else '')

        # DataFrame yaratish
        data = {
            'Savol': savollar,
            "To'g'ri javob": togri_javoblar,
            '1-maqbul javob': maqbul_javob_1,
            '2-maqbul javob': maqbul_javob_2,
            '3-maqbul javob': maqbul_javob_3
        }
        df = pd.DataFrame(data)

        # DataFrame'ni ko'rsatish
        st.dataframe(df)

        # Excel fayliga yozish
        if st.button("Excel faylga saqlash"):
            df.to_excel('quiz_results_updated.xlsx', index=False, engine='openpyxl')
            st.success("Ma'lumotlar muvaffaqiyatli ravishda 'quiz_results_updated.xlsx' fayliga saqlandi!")
    else:
        st.error("quizData topilmadi yoki JSON formatida xato bor.")
else:
    st.info("Iltimos, HTML faylni yuklang.")