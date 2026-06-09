package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

var blsSeriesByIndicator = map[string]string{
	"cpi":           "CUUR0000SA0",
	"ppi":           "WPUFD4",
	"import-prices": "EIUIR",
}

func blsHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	indicator := strings.TrimPrefix(r.URL.Path, "/api/bls/")
	seriesID, ok := blsSeriesByIndicator[indicator]
	if !ok {
		http.Error(w, "Unsupported BLS indicator", http.StatusBadRequest)
		return
	}

	endYear := time.Now().Year()
	startYear := endYear - 9

	url := "https://api.bls.gov/publicAPI/v2/timeseries/data/"
	payload := []byte(fmt.Sprintf(`{"seriesid":["%s"], "startyear":"%d", "endyear":"%d"}`, seriesID, startYear, endYear))

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

func main() {
	http.HandleFunc("/api/bls/", blsHandler)
	fmt.Println("Server listening on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
