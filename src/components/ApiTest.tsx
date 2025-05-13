
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";

export const ApiTest = () => {
  const [url, setUrl] = useState("/api/admin/test.php");
  const [method, setMethod] = useState("GET");
  const [payload, setPayload] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse("");

    try {
      let result;
      if (method === "GET") {
        result = await axios.get(url);
      } else if (method === "POST") {
        const payloadData = payload ? JSON.parse(payload) : {};
        result = await axios.post(url, payloadData);
      }

      setResponse(JSON.stringify(result?.data, null, 2));
      toast({
        title: "API Request Successful",
        description: `${method} request to ${url} completed`,
      });
    } catch (error: any) {
      console.error("API Test Error:", error);
      setResponse(
        JSON.stringify(
          {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
          },
          null,
          2
        )
      );
      toast({
        title: "API Request Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>API Test Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Label htmlFor="url">API URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter API URL"
              />
            </div>
            <div>
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>

          {method === "POST" && (
            <div>
              <Label htmlFor="payload">Request Payload (JSON)</Label>
              <Textarea
                id="payload"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder="{}"
                rows={5}
              />
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Request"}
          </Button>
        </form>

        {response && (
          <div className="mt-6">
            <Label htmlFor="response">Response</Label>
            <pre className="p-4 bg-gray-100 rounded-md overflow-x-auto text-sm">
              {response}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiTest;
