export default function RedirectPage({ examId }) {
    return (
        <html>
            <head>
                <title>Opening ExamBuddy...</title>
                <style>
                    {`
          body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
          .loader {
            margin: 20px auto;
            border: 6px solid #eee;
            border-top: 6px solid #007bff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          `}
                </style>
            </head>
            <body>
                <h2>Opening ExamBuddy...</h2>
                <div class="loader"></div>
                <p>If the app doesn't open, install or open manually.</p>

                <script>
                    {`
          const examId = "${examId}";
          const appLink = "exambuddy://open?examId=" + examId;
          const downloadURL = "https://your-download-link.com"; // change this

          setTimeout(() => {
            window.location.href = downloadURL; 
          }, 1500); // fallback timeout

          window.location.href = appLink;
          `}
                </script>
            </body>
        </html>
    );
}

export async function getServerSideProps(context) {
    return {
        props: {
            examId: context.query.examId || "",
        },
    };
}
